import { randomUUID } from 'node:crypto';

import type { InstanceAiEvalAgentScenarioSeed, ToolTestCapability } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { IHttpRequestMethods, INode } from 'n8n-workflow';

import type {
	OpenWorldInput,
	SimulatedAgent,
	SimulatedReply,
	SimulationBackend,
	SimulationWorld,
} from '@/modules/agents/simulation/tool-simulation.contracts';

import { generateAgentScenarioSeed, type AgentSeedToolSummary } from './agent-scenario-seed';
import { createLlmMockHandler } from './mock-handler';
import { redactSecretValuePatterns, truncateForLlm } from './request-sanitizer';

const MAX_SCENARIO_HINT_CHARS = 2_000;

/** Tool kinds the LLM mock can answer. n8n blocks the other kinds before they get here. */
const SERVED_KINDS = new Set<ToolTestCapability['kind']>(['node', 'workflow']);

/**
 * The first simulation backend: the LLM mock that the agent evals use. Every
 * reply is invented by an LLM (`made_up`). It never sends a request to a real
 * service. A world is the scenario seed (shared context and per-tool hints),
 * generated from the test chat's first message, so later turns stay coherent.
 */
@Service()
export class LlmMockSimulationBackend implements SimulationBackend {
	readonly id = 'llm-mock' as const;

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
		return this.buildWorld(`llm-mock-${randomUUID()}`, seed, scenarioHints);
	}

	private buildWorld(
		worldId: string,
		seed: InstanceAiEvalAgentScenarioSeed,
		scenarioHints: string,
	): SimulationWorld {
		const httpMock: EvalLlmMockHandler = createLlmMockHandler({
			scenarioHints,
			globalContext: seed.globalContext,
			nodeHints: seed.toolHints,
		});

		return {
			worldId,
			backend: this.id,
			handleRequest: async (request, call): Promise<SimulatedReply> => {
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
			kind: tool.kind as AgentSeedToolSummary['kind'],
			...(tool.description ? { description: tool.description } : {}),
			...(tool.nodeType ? { nodeType: tool.nodeType } : {}),
		}));
}
