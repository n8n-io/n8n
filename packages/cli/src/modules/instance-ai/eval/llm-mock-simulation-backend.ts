import { randomUUID } from 'node:crypto';

import type { InstanceAiEvalAgentScenarioSeed, ToolTestCapability } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { FetchFn } from '@n8n/agents';
import type { IHttpRequestMethods, INode, JsonObject } from 'n8n-workflow';

import type {
	OpenWorldInput,
	SavedSimulationWorld,
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
import { createWebSearchMock } from './web-search-mock';

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

	async openWorld({ agent, firstMessage, saved }: OpenWorldInput): Promise<SimulationWorld> {
		const restored = parseSaved(saved);
		const scenarioHints = truncateForLlm(
			redactSecretValuePatterns(firstMessage),
			MAX_SCENARIO_HINT_CHARS,
		);
		const seed =
			restored?.seed ??
			(await generateAgentScenarioSeed({
				agentName: agent.name,
				instructions: agent.instructions,
				tools: seedTools(agent),
				scenarioHints,
			}));
		const worldId = restored?.worldId ?? `llm-mock-${randomUUID()}`;
		return await this.buildWorld(worldId, agent, seed, restored?.scenarioHints ?? scenarioHints);
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
		const mcpServers = agent.tools
			.filter((tool) => tool.kind === 'mcp' && tool.url)
			.map((tool) => ({ name: tool.toolName, url: tool.url!, description: tool.description }));
		const mcpFetch: FetchFn = createMcpMockFetch({
			servers: mcpServers,
			agentInstructions: agent.instructions,
			scenarioHints,
			globalContext: seed.globalContext,
			serverHints: seed.toolHints,
			knownToolsByServer: await resolveCanonicalMcpCatalogs(
				mcpServers.map((server) => ({
					...server,
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
			save: (): SavedSimulationWorld => ({
				worldId,
				scenarioHints,
				seed: seed as unknown as JsonObject,
			}),
			handleRequest: async (request, call): Promise<SimulatedReply> => {
				if (request.protocol === 'web_search') {
					const body = await webSearch(request.body as Parameters<typeof webSearch>[0]);
					return { outcome: 'served', source: 'made_up', status: 200, body };
				}
				if (request.protocol === 'mcp') {
					const response = await mcpFetch(request.url, {
						method: request.method,
						headers: { 'content-type': 'application/json', ...(request.headers ?? {}) },
						...(request.body === undefined
							? {}
							: {
									body:
										typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
								}),
					});
					return {
						outcome: 'served',
						source: 'made_up',
						status: response.status,
						headers: Object.fromEntries(response.headers.entries()),
						body: await response.text(),
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

function parseSaved(
	saved: SavedSimulationWorld | undefined,
): { worldId: string; scenarioHints: string; seed: InstanceAiEvalAgentScenarioSeed } | undefined {
	if (!saved) return undefined;
	const { worldId, scenarioHints, seed } = saved;
	if (typeof worldId !== 'string' || typeof scenarioHints !== 'string') return undefined;
	if (typeof seed !== 'object' || seed === null || Array.isArray(seed)) return undefined;
	if (typeof seed.globalContext !== 'string' || typeof seed.openingMessage !== 'string') {
		return undefined;
	}
	return { worldId, scenarioHints, seed: seed as unknown as InstanceAiEvalAgentScenarioSeed };
}
