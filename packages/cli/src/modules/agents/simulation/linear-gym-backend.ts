import { OperationalError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

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
function known(agent: SimulatedAgent) {
	const matches = agent.tools.filter((t) => t.toolName === 'linear');
	return (
		matches.length === 1 &&
		matches[0].kind === 'mcp' &&
		matches[0].origin === 'https://mcp.linear.app'
	);
}
const rpc = (name: string, args: unknown) => ({
	jsonrpc: '2.0',
	id: 1,
	method: 'tools/call',
	params: { name, arguments: args },
});
const served = (body: unknown, status = 200): SimulatedReply => ({
	outcome: 'served',
	source: 'world_state',
	status,
	body,
});

export class LinearGymBackend implements SimulationBackend {
	readonly id = 'shared-simulation-layer';
	async describeTools(agent: SimulatedAgent) {
		return known(agent)
			? [{ toolName: 'linear', kind: 'mcp' as const, testability: 'simulated' as const }]
			: [];
	}
	async openWorld({ agent, ownerId, testChatId }: OpenWorldInput): Promise<SimulationWorld> {
		if (!known(agent) || !ownerId || !testChatId || !agent.projectId || !agent.agentId)
			throw unavailable();
		try {
			const base = endpoint(process.env.GYM_BASE_URL, '/');
			const upstream = endpoint(process.env.LINEAR_UPSTREAM_URL, '/mcp');
			const token = process.env.GYM_HARNESS_TOKEN;
			if (token !== 'synthetic-loopback-harness' || new URL(upstream).origin === base)
				throw unavailable();
			const scope = createHash('sha256')
				.update(JSON.stringify([ownerId, agent.projectId, agent.agentId, testChatId, 'linear']))
				.digest('hex');
			const read = await json(upstream, 'POST', rpc('get_issue', { id: identifier }), {
				'x-fixture-scope': scope,
			});
			const result = z
				.object({
					jsonrpc: z.literal('2.0'),
					id: z.literal(1),
					result: content.extend({ isError: z.literal(false).optional() }),
				})
				.parse(read);
			const issue = fixtureIssue.parse(JSON.parse(result.result.content[0].text));
			const worldId = randomUUID();
			const world = {
				world_version: 1,
				persona: { name: 'Fixture', email: 'fixture@example.test' },
				native: {
					linear: {
						teams: [{ id: issue.teamId, key: 'FIN', name: issue.team, ref: 'team:fin' }],
						issues: [
							// Gym uses `number` to preserve the issue identifier.
							// eslint-disable-next-line id-denylist
							{ id: uuid, number: 412, title: issue.title, team: 'team:fin', ref: 'issue:renew' },
						],
					},
				},
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
			return {
				worldId,
				backend: this.id,
				async handleRequest(req) {
					const unsupported = { outcome: 'unsupported' } as const;
					if (
						req.protocol !== 'mcp' ||
						req.server !== 'linear' ||
						req.method !== 'POST' ||
						!isRecord(req.body) ||
						req.body.jsonrpc !== '2.0'
					)
						return unsupported;
					const { method, id: callId, params } = req.body;
					if (method === 'notifications/initialized') return served(null, 204);
					if (typeof callId !== 'string' && typeof callId !== 'number') return unsupported;
					const answer = (value: unknown) => served({ jsonrpc: '2.0', id: callId, result: value });
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
					const args = (params.name === 'get_issue' ? readArgs : writeArgs).safeParse(
						params.arguments,
					);
					if (!args.success) return unsupported;
					try {
						const response = await json(base + '/mcp', 'POST', rpc(params.name, args.data), {
							authorization: `Bearer ${key}`,
						});
						const parsed = z
							.object({
								jsonrpc: z.literal('2.0'),
								id: z.literal(1),
								result: content.extend({ isError: z.literal(false).optional() }),
							})
							.parse(response);
						return answer(parsed.result);
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
