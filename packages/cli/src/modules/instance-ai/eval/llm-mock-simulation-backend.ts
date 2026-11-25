import { randomUUID } from 'node:crypto';

import type { InstanceAiEvalAgentScenarioSeed, ToolTestCapability } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { OperationalError } from '@n8n/errors';
import { Service } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { FetchFn } from '@n8n/agents';
import type { IHttpRequestMethods, INode } from 'n8n-workflow';

import type {
	OpenWorldInput,
	SimulatedAgent,
	SimulatedReply,
	SimulationBackend,
	SimulationWorld,
} from '@/modules/agents/simulation/tool-simulation.contracts';

import type { AgentSeedToolSummary } from './agent-scenario-seed';

const MAX_SCENARIO_HINT_CHARS = 2_000;

const DEFAULT_MCP_MOCK_ORIGIN = 'https://mcp.invalid';

/** Loads the mocks when a test run opens a world, so a normal startup does not load them. */
async function loadMocks() {
	const [executionService, scenarioSeed, mcpMock, mockHandler, sanitizer, webSearchMock] =
		await Promise.all([
			import('./agent-execution.service.js'),
			import('./agent-scenario-seed.js'),
			import('./mcp-mock-fetch.js'),
			import('./mock-handler.js'),
			import('./request-sanitizer.js'),
			import('./web-search-mock.js'),
		]);
	return {
		...executionService,
		...scenarioSeed,
		...mcpMock,
		...mockHandler,
		...sanitizer,
		...webSearchMock,
	};
}

type Mocks = Awaited<ReturnType<typeof loadMocks>>;

/** Tool kinds the LLM mock can answer. n8n blocks the other kinds before they get here. */
const SERVED_KINDS = new Set<ToolTestCapability['kind']>(['node', 'workflow', 'mcp', 'web_search']);

/**
 * Simulation backend on the agent eval LLM mock: every reply is `made_up`. A world is a scenario
 * seed from the chat's first message, so later replies stay coherent.
 */
@Service()
export class LlmMockSimulationBackend implements SimulationBackend {
	readonly id = 'llm-mock' as const;

	constructor(
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async describeTools(agent: SimulatedAgent): Promise<ToolTestCapability[]> {
		return await Promise.resolve(
			agent.tools.map(
				(tool): ToolTestCapability =>
					SERVED_KINDS.has(tool.kind)
						? { toolName: tool.toolName, kind: tool.kind, testability: 'simulated' }
						: {
								toolName: tool.toolName,
								kind: tool.kind,
								testability: 'blocked',
								reason: 'unsupported_by_simulator',
								detail: 'The LLM mock cannot answer this kind of tool.',
							},
			),
		);
	}

	async openWorld({ agent, firstMessage }: OpenWorldInput): Promise<SimulationWorld> {
		const mocks = await loadMocks();
		const scenarioHints = mocks.truncateForLlm(
			mocks.redactSecretValuePatterns(firstMessage),
			MAX_SCENARIO_HINT_CHARS,
		);
		const seed = await mocks.generateAgentScenarioSeed({
			agentName: agent.name,
			instructions: agent.instructions,
			tools: seedTools(agent),
			scenarioHints,
		});
		return await this.buildWorld(mocks, `llm-mock-${randomUUID()}`, agent, seed, scenarioHints);
	}

	private async buildWorld(
		mocks: Mocks,
		worldId: string,
		agent: SimulatedAgent,
		seed: InstanceAiEvalAgentScenarioSeed,
		scenarioHints: string,
	): Promise<SimulationWorld> {
		const {
			createLlmMockHandler,
			createMcpMockFetch,
			createWebSearchMock,
			resolveCanonicalMcpCatalogs,
			MCP_MOCK_GENERATION_FAILURE_PREFIX,
			WEB_SEARCH_MOCK_FAILURE_NOTE,
		} = mocks;
		const httpMock: EvalLlmMockHandler = createLlmMockHandler({
			scenarioHints,
			globalContext: seed.globalContext,
			nodeHints: seed.toolHints,
		});
		// The mock tells servers apart by URL. The simulator never gets the real one, so each
		// server gets a URL made from its name, under its origin for a registry catalog match.
		const mcpServers = agent.tools
			.filter((tool) => tool.kind === 'mcp')
			.map((tool) => {
				const origin = tool.origin === undefined ? undefined : safeMcpOrigin(tool.origin);
				return {
					name: tool.toolName,
					url: mockMcpUrl(tool.toolName, origin),
					origin,
					description: tool.description,
				};
			});
		const mcpFetch: FetchFn = createMcpMockFetch({
			servers: mcpServers,
			agentInstructions: agent.instructions,
			scenarioHints,
			globalContext: seed.globalContext,
			serverHints: seed.toolHints,
			knownToolsByServer: await resolveCanonicalMcpCatalogs(
				mcpServers.map((server) => ({
					name: server.name,
					url: server.origin ?? server.url,
					transport: 'streamableHttp' as const,
					authentication: 'none',
				})),
				this.moduleRegistry,
				this.logger,
			),
			logger: this.logger,
			onToolCall: () => {},
		});
		const webSearch = createWebSearchMock({
			agentInstructions: agent.instructions,
			scenarioHints,
			globalContext: seed.globalContext,
			searchHint: seed.toolHints?.web_search,
			logger: this.logger,
			onSearch: () => {},
		});

		return {
			worldId,
			backend: this.id,
			handleRequest: async (request, call): Promise<SimulatedReply> => {
				// A stopped run neither starts nor waits for a generation.
				const { signal } = call;
				if (signal?.aborted) throw stoppedError();
				if (request.protocol === 'web_search') {
					const body = await untilStopped(webSearch(request.args, { signal }), signal);
					if (body.note === WEB_SEARCH_MOCK_FAILURE_NOTE) {
						return { outcome: 'unavailable', detail: 'The LLM mock failed to answer this search.' };
					}
					return { outcome: 'served', source: 'made_up', status: 200, body };
				}
				if (request.protocol === 'mcp') {
					const server = mcpServers.find((entry) => entry.name === request.server);
					if (!server) {
						return {
							outcome: 'unsupported',
							detail: 'The LLM mock does not know this MCP server.',
						};
					}
					const response = await untilStopped(
						mcpFetch(server.url, {
							method: request.method,
							headers: { 'content-type': 'application/json', ...(request.headers ?? {}) },
							...(request.body === undefined
								? {}
								: {
										body:
											typeof request.body === 'string'
												? request.body
												: JSON.stringify(request.body),
									}),
							...(signal ? { signal } : {}),
						}),
						signal,
					);
					const text = await response.text();
					// The MCP mock reports a failure as a JSON-RPC internal error, or a failed tool
					// generation as an error result with a fixed text.
					if (
						isMcpInternalError(text) ||
						isMcpGenerationFailure(text, MCP_MOCK_GENERATION_FAILURE_PREFIX)
					) {
						return {
							outcome: 'unavailable',
							detail: 'The LLM mock failed to answer this MCP call.',
						};
					}
					return {
						outcome: 'served',
						source: 'made_up',
						status: response.status,
						headers: Object.fromEntries(response.headers.entries()),
						body: text,
					};
				}
				const node: INode = {
					id: call.toolCallId ?? call.toolName,
					name: call.toolName,
					type: call.nodeType ?? 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				};
				const response = await untilStopped(
					httpMock(
						{
							url: request.url,
							method: request.method as IHttpRequestMethods,
							headers: request.headers,
							body: request.body as never,
							...(signal ? { abortSignal: signal } : {}),
						},
						node,
					),
					signal,
				);
				if (!response) {
					return { outcome: 'unsupported', detail: 'The LLM mock could not answer this request.' };
				}
				// A failed generation comes back as a 200 with an error marker, not as a reply.
				if (isMockGenerationError(response.body)) {
					return { outcome: 'unavailable', detail: 'The LLM mock failed to answer this request.' };
				}
				return {
					outcome: 'served',
					source: 'made_up',
					status: response.statusCode,
					headers: response.headers,
					body: response.body,
				};
			},
		};
	}
}

function mockMcpUrl(serverName: string, origin = DEFAULT_MCP_MOCK_ORIGIN): string {
	return `${origin}/n8n-mcp-server/${encodeURIComponent(serverName)}`;
}

/**
 * Keep only the scheme and host of an HTTP(S) URL. The mock puts the URL in its prompt, and the
 * user info, path or query of a real URL can hold a key.
 */
function safeMcpOrigin(origin: string): string {
	let url: URL;
	try {
		url = new URL(origin);
	} catch {
		return DEFAULT_MCP_MOCK_ORIGIN;
	}
	return url.protocol === 'http:' || url.protocol === 'https:'
		? url.origin
		: DEFAULT_MCP_MOCK_ORIGIN;
}

function seedTools(agent: SimulatedAgent): AgentSeedToolSummary[] {
	return agent.tools
		.filter((tool) => SERVED_KINDS.has(tool.kind))
		.map((tool) => ({
			name: tool.toolName,
			kind: tool.kind === 'web_search' ? 'other' : (tool.kind as AgentSeedToolSummary['kind']),
			...(tool.description ? { description: tool.description } : {}),
			...(tool.nodeType ? { nodeType: tool.nodeType } : {}),
		}));
}

function isMockGenerationError(body: unknown): boolean {
	return typeof body === 'object' && body !== null && '_evalMockError' in body;
}

function stoppedError() {
	return new OperationalError('The test run was stopped.');
}

/** Stops waiting for a generation when the run stops. The session then blocks the call. */
async function untilStopped<T>(work: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
	if (!signal) return await work;
	return await new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(stoppedError());
		signal.addEventListener('abort', onAbort, { once: true });
		work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
	});
}

/** A `tools/call` result that the MCP mock made because it failed to generate one. */
function isMcpGenerationFailure(text: string, failurePrefix: string): boolean {
	try {
		const parsed: unknown = JSON.parse(text);
		if (typeof parsed !== 'object' || parsed === null || !('result' in parsed)) return false;
		const result = parsed.result;
		if (typeof result !== 'object' || result === null || !('isError' in result)) return false;
		if (result.isError !== true || !('content' in result) || !Array.isArray(result.content)) {
			return false;
		}
		const first: unknown = result.content[0];
		return (
			typeof first === 'object' &&
			first !== null &&
			'text' in first &&
			typeof first.text === 'string' &&
			first.text.startsWith(failurePrefix)
		);
	} catch {
		return false;
	}
}

const JSON_RPC_INTERNAL_ERROR = -32603;

function isMcpInternalError(text: string): boolean {
	try {
		const parsed: unknown = JSON.parse(text);
		return (
			typeof parsed === 'object' &&
			parsed !== null &&
			'error' in parsed &&
			typeof parsed.error === 'object' &&
			parsed.error !== null &&
			'code' in parsed.error &&
			parsed.error.code === JSON_RPC_INTERNAL_ERROR
		);
	} catch {
		return false;
	}
}
