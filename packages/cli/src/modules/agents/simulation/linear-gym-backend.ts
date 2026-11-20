import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolCallEvidence, ToolTestCapability } from '@n8n/api-types';
import { OperationalError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { McpCaller } from '../../mcp-guard/mcp-upstream';
import { GuardRouter } from '../../mcp-guard/router';
import { PlanHydrator } from '../../mcp-guard/plan-hydrator';

import { LinearGymManifest } from './linear-gym-manifest';
import type { ReadCapabilityFactory } from './read-capability';
import type {
	OpenWorldInput,
	SimulatedAgent,
	SimulatedReply,
	SimulationBackend,
	SimulationWorld,
} from './tool-simulation.contracts';

const identifier = 'FIN-412';
const uuid = '33333333-3333-4333-8333-333333333333';
const id = z.enum([identifier, uuid]);
const readArgs = z.object({ id }).strict();
const writeArgs = z.object({ id, title: z.string().min(1).max(500) }).strict();
const content = z.object({
	content: z.array(z.object({ type: z.literal('text'), text: z.string() })).length(1),
});
const fixtureIssue = z.object({
	id: z.literal(identifier),
	uuid: z.literal(uuid),
	title: z.string(),
	team: z.string(),
	teamId: z.literal('11111111-1111-4111-8111-111111111111'),
});
function unavailable() {
	return new OperationalError('The local Linear fixture is unavailable.');
}
function endpoint(value: string | undefined, suffix: string) {
	if (
		!value ||
		!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}(?:\/mcp)?$/.test(value) ||
		new URL(value).pathname !== suffix
	)
		throw unavailable();
	return value;
}
async function json(
	url: string,
	method: string,
	body: unknown,
	headers: Record<string, string>,
): Promise<unknown> {
	const r = await fetch(url, {
		method,
		redirect: 'error',
		signal: AbortSignal.timeout(3000),
		headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
		body: JSON.stringify(body),
	});
	if (!r.ok) throw unavailable();
	return await r.json();
}
const harnessToken = 'synthetic-loopback-harness';
/** Every MCP server of the agent. A server without an origin stays, so an outage blocks it too. */
const mcpServers = (agent: SimulatedAgent) => agent.tools.filter((tool) => tool.kind === 'mcp');
const rpc = (name: string, args: unknown) => ({
	jsonrpc: '2.0',
	id: 1,
	method: 'tools/call',
	params: { name, arguments: args },
});
const upstreamResult = content.extend({ isError: z.boolean().optional() });
/**
 * The only read caller in this package: the loopback Linear fixture. It sends no credential. The
 * fixture tells the worlds apart by a digest of the binding.
 */
export const loopbackFixtureReadCapability: ReadCapabilityFactory = async (binding, readTools) => {
	const upstream = endpoint(process.env.LINEAR_UPSTREAM_URL, '/mcp');
	const scope = createHash('sha256')
		.update(
			JSON.stringify([
				binding.ownerId,
				binding.projectId,
				binding.agentId,
				binding.testChatId,
				'linear',
			]),
		)
		.digest('hex');
	return {
		read: async (toolName, args) => {
			if (!readTools.has(toolName)) throw unavailable();
			const raw = await json(upstream, 'POST', rpc(toolName, args), { 'x-fixture-scope': scope });
			return z
				.object({ jsonrpc: z.literal('2.0'), id: z.literal(1), result: upstreamResult })
				.parse(raw).result;
		},
	};
};
type ServedReply = Extract<SimulatedReply, { outcome: 'served' }>;
/** What one request of a tool did. The evidence of its reply comes from this record only. */
interface RequestTrace {
	/** Requests that the scoped read caller sent to the real service. */
	upstreamReads: number;
	/** The last answer of the Gym without an error. */
	gymAnswer?: CallToolResult;
}
const served = (body: unknown, status = 200, evidence?: ToolCallEvidence[]): ServedReply => ({
	outcome: 'served',
	source: 'world_state',
	...(evidence && { evidence }),
	status,
	body,
});

/**
 * Opt-in fixture backend for one Linear issue. The Gym world holds each write. The only request
 * to the real service is the scoped `get_issue` read of the fixture caller.
 */
export class LinearGymBackend implements SimulationBackend {
	readonly id = 'shared-simulation-layer';

	/** The world copies data that the Linear connection of the draft can read. */
	readonly worldDependsOnDraftConnections = true;

	private readonly manifest = new LinearGymManifest();

	constructor(
		private readonly readCapability: ReadCapabilityFactory = loopbackFixtureReadCapability,
	) {}

	/**
	 * The name of the one MCP server of the agent that the Gym serves. A world holds one Linear
	 * workspace, so two servers on a served origin give no name. Rejects when the Gym cannot tell.
	 */
	private async servedServer(agent: SimulatedAgent): Promise<string | undefined> {
		const base = endpoint(process.env.GYM_BASE_URL, '/');
		const token = process.env.GYM_HARNESS_TOKEN;
		if (token !== harnessToken) throw unavailable();
		const origins = await this.manifest.mcpOrigins(base, token);
		// Scheme, host and port must all match. A server without an origin matches nothing.
		const served = mcpServers(agent).filter(
			({ origin }) => origin && URL.canParse(origin) && origins.has(new URL(origin).origin),
		);
		return served.length === 1 ? served[0].toolName : undefined;
	}

	async describeTools(agent: SimulatedAgent): Promise<ToolTestCapability[]> {
		const servers = mcpServers(agent);
		if (servers.length === 0) return [];
		try {
			const toolName = await this.servedServer(agent);
			return toolName ? [{ toolName, kind: 'mcp', testability: 'simulated' }] : [];
		} catch {
			// Without an answer of the Gym, no MCP server is served. There is no fallback.
			return servers.map(({ toolName }) => ({
				toolName,
				kind: 'mcp',
				testability: 'blocked',
				reason: 'simulator_unavailable',
				detail: 'The simulator did not report what it serves.',
			}));
		}
	}
	async openWorld({ agent, ownerId, testChatId }: OpenWorldInput): Promise<SimulationWorld> {
		if (!ownerId || !testChatId || !agent.projectId || !agent.agentId) throw unavailable();
		try {
			const server = await this.servedServer(agent);
			if (!server) throw unavailable();
			const base = endpoint(process.env.GYM_BASE_URL, '/');
			const upstream = endpoint(process.env.LINEAR_UPSTREAM_URL, '/mcp');
			const token = process.env.GYM_HARNESS_TOKEN;
			if (token !== harnessToken || new URL(upstream).origin === new URL(base).origin)
				throw unavailable();
			const worldId = randomUUID();
			const world = {
				world_version: 1,
				persona: { name: 'Fixture', email: 'fixture@example.test' },
				native: { linear: { teams: [{ key: 'LOCAL', name: 'Local fixture' }] } },
			};
			const tenant = await json(
				`${base}/_sim/v1/tenants/${worldId}`,
				'PUT',
				{ admin_token: randomUUID(), world },
				{ authorization: `Bearer ${token}` },
			);
			const key = z
				.object({
					n8n_credentials: z.object({ linearApi: z.object({ apiKey: z.string().min(1) }) }),
				})
				.parse(tenant).n8n_credentials.linearApi.apiKey;
			const readTools = new Set(['get_issue']);
			// Overlapping requests of one world each get their own record.
			const requests = new AsyncLocalStorage<RequestTrace>();
			const response = z.object({
				jsonrpc: z.literal('2.0'),
				id: z.literal(1),
				result: content.extend({ isError: z.boolean().optional() }),
			});
			// One read caller for each world. Only this closure holds it, so a later world cannot
			// replace it. It gets the binding and a copy of the allowlist, and nothing of the Gym.
			const reader = await this.readCapability(
				Object.freeze({
					ownerId,
					projectId: agent.projectId,
					agentId: agent.agentId,
					testChatId,
				}),
				new Set(readTools),
			);
			const fixture: McpCaller = {
				listTools: async () => [],
				callTool: async (name, args) => {
					if (!readTools.has(name) || !readArgs.safeParse(args).success) throw unavailable();
					const trace = requests.getStore();
					if (trace) trace.upstreamReads++;
					const result = upstreamResult.parse(await reader.read(name, { id: identifier }));
					if (result.isError) throw unavailable();
					const issue = fixtureIssue.parse(JSON.parse(result.content[0].text));
					return { content: [{ type: 'text', text: JSON.stringify(issue) }] };
				},
			};
			let seeded = false;
			const gym: McpCaller = {
				listTools: async () => [{ name: 'get_issue', inputSchema: { type: 'object' } }],
				callTool: async (name, args) => {
					if (name === 'save_issue' && !seeded) throw unavailable();
					const { result } = response.parse(
						await json(base + '/mcp', 'POST', rpc(name, args), { authorization: `Bearer ${key}` }),
					);
					const trace = requests.getStore();
					if (trace && !result.isError) trace.gymAnswer = result;
					return result;
				},
			};
			const hydrator = new PlanHydrator({
				upstream: fixture,
				gym,
				readTools,
				tenant: worldId,
				instructions: '',
				admin: {
					seed: async (_, overlay) => {
						if (seeded) throw unavailable();
						// The planner can drop an unresolved pointer. Never seed a partial issue.
						z.object({
							native: z.object({
								linear: z.object({
									teams: z.tuple([
										z.object({
											id: fixtureIssue.shape.teamId,
											key: z.literal('FIN'),
											name: z.string(),
										}),
									]),
									issues: z.tuple([
										z.object({
											id: z.literal(uuid),
											title: z.string(),
											team: z.literal('team:fin'),
										}),
									]),
								}),
							}),
						}).parse(overlay);
						const report = await json(`${base}/_sim/v1/tenants/${worldId}/seed`, 'POST', overlay, {
							authorization: `Bearer ${token}`,
						});
						seeded = true;
						return report;
					},
					event: async () => {
						throw unavailable();
					},
				},
				lookups: (name) =>
					name === 'save_issue' && !seeded ? [{ tool: 'get_issue', args: { id: identifier } }] : [],
				llm: async ({ prompt }) => {
					if (seeded) return '{}';
					const source = prompt.startsWith('An agent called a read tool.')
						? '$result'
						: '$reads[0]';
					return JSON.stringify({
						overlay: {
							native: {
								linear: {
									teams: [
										{ id: source + '.teamId', key: 'FIN', name: source + '.team', ref: 'team:fin' },
									],
									issues: [
										{
											id: source + '.uuid',
											// Gym uses number to preserve the issue identifier.
											// eslint-disable-next-line id-denylist
											number: 412,
											title: source + '.title',
											team: 'team:fin',
											ref: 'issue:renew',
										},
									],
								},
							},
						},
					});
				},
			});
			const router = new GuardRouter({
				upstream: fixture,
				gym,
				hydrator,
				readTools,
				writeTools: new Set(['save_issue']),
			});
			return {
				worldId,
				backend: this.id,
				async handleRequest(req) {
					const unsupported = { outcome: 'unsupported' } as const;
					if (
						req.protocol !== 'mcp' ||
						req.server !== server ||
						req.method !== 'POST' ||
						!isRecord(req.body) ||
						req.body.jsonrpc !== '2.0'
					)
						return unsupported;
					const { method, id: callId, params } = req.body;
					if (method === 'notifications/initialized') return served(null, 204);
					if (typeof callId !== 'string' && typeof callId !== 'number') return unsupported;
					const answer = (value: unknown, evidence?: ToolCallEvidence[]) =>
						served({ jsonrpc: '2.0', id: callId, result: value }, 200, evidence);
					if (method === 'initialize')
						return answer({
							protocolVersion: '2025-06-18',
							capabilities: { tools: {} },
							serverInfo: { name: 'linear-fixture', version: '1' },
						});
					if (method === 'tools/list')
						return answer({
							tools: ['get_issue', 'save_issue'].map((name) => ({
								name,
								inputSchema: {
									type: 'object',
									additionalProperties: false,
									properties: {
										id: { type: 'string', enum: [identifier, uuid] },
										...(name === 'save_issue'
											? { title: { type: 'string', minLength: 1, maxLength: 500 } }
											: {}),
									},
									required: name === 'save_issue' ? ['id', 'title'] : ['id'],
								},
							})),
						});
					if (
						method !== 'tools/call' ||
						!isRecord(params) ||
						(params.name !== 'get_issue' && params.name !== 'save_issue')
					)
						return unsupported;
					const toolName = params.name;
					const args = (toolName === 'get_issue' ? readArgs : writeArgs).safeParse(
						params.arguments,
					);
					if (!args.success) return unsupported;
					try {
						const trace: RequestTrace = { upstreamReads: 0 };
						const result = await requests.run(
							trace,
							async () => await router.callTool(toolName, args.data),
						);
						// Only an answer that the Gym gave to this request is served.
						if (result.isError || !seeded || result !== trace.gymAnswer)
							return { outcome: 'unavailable' };
						const evidence: ToolCallEvidence[] = trace.upstreamReads > 0 ? ['real_read'] : [];
						evidence.push(toolName === 'get_issue' ? 'world_read' : 'world_write');
						return answer(result, evidence);
					} catch {
						return { outcome: 'unavailable' };
					}
				},
			};
		} catch {
			throw unavailable();
		}
	}
}
