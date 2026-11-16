import { randomUUID } from 'node:crypto';

import type { InstanceAiEvalAgentScenarioSeed, ToolTestCapability } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
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

import { resolveCanonicalMcpCatalogs } from './agent-execution.service';
import { generateAgentScenarioSeed, type AgentSeedToolSummary } from './agent-scenario-seed';
import { createMcpMockFetch } from './mcp-mock-fetch';
import { createLlmMockHandler } from './mock-handler';
import { redactSecretValuePatterns, truncateForLlm } from './request-sanitizer';
import { createWebSearchMock, WEB_SEARCH_MOCK_FAILURE_NOTE } from './web-search-mock';

const MAX_SCENARIO_HINT_CHARS = 2_000;

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
		const scenarioHints = truncateForLlm(
			redactSecretValuePatterns(firstMessage),
			MAX_SCENARIO_HINT_CHARS,
		);
		const seed = await generateAgentScenarioSeed({
			agentName: agent.name,
			instructions: agent.instructions,
			tools: seedTools(agent),
			scenarioHints,
		});
		return await this.buildWorld(`llm-mock-${randomUUID()}`, agent, seed, scenarioHints);
	}

	private async buildWorld(
		worldId: string,
		agent: SimulatedAgent,
		seed: InstanceAiEvalAgentScenarioSeed,
		scenarioHints: string,
	): Promise<SimulationWorld> {
		const httpMock: EvalLlmMockHandler = createLlmMockHandler({
			scenarioHints,
			globalContext: seed.globalContext,
			nodeHints: seed.toolHints,
		});
		// The mock tells servers apart by URL. The simulator never gets the real one, so each
		// server gets a URL made from its name, under its origin for a registry catalog match.
		const mcpServers = agent.tools
			.filter((tool) => tool.kind === 'mcp')
			.map((tool) => ({
				name: tool.toolName,
				url: mockMcpUrl(tool.toolName, tool.origin),
				origin: tool.origin,
				description: tool.description,
			}));
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
				if (request.protocol === 'web_search') {
					const body = await webSearch(request.args);
					if (body.note === WEB_SEARCH_MOCK_FAILURE_NOTE) {
						return { outcome: 'unavailable', detail: 'The LLM mock failed to answer this search.' };
					}
					return { outcome: 'served', source: 'made_up', status: 200, body };
				}
				if (request.protocol === 'mcp') {
					const server = mcpServers.find((entry) => entry.name === request.server);
					if (!server) {
						return { outcome: 'unsupported', detail: 'The LLM mock does not know this MCP server.' };
					}
					const response = await mcpFetch(server.url, {
						method: request.method,
						headers: { 'content-type': 'application/json', ...(request.headers ?? {}) },
						...(request.body === undefined
							? {}
							: {
									body:
										typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
								}),
					});
					const text = await response.text();
					// The MCP mock reports a failed generation as a JSON-RPC internal error.
					if (isMcpInternalError(text)) {
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
				const response = await httpMock(
					{
						url: request.url,
						method: request.method as IHttpRequestMethods,
						headers: request.headers,
						body: request.body as never,
					},
					node,
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

function mockMcpUrl(serverName: string, origin = 'https://mcp.invalid'): string {
	return `${origin}/n8n-mcp-server/${encodeURIComponent(serverName)}`;
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
