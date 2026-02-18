import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

import { createResponderAgent, invokeResponderAgent } from '@/agents/responder.agent';
import type { ResponderContext } from '@/agents/responder.agent';
import type { CoordinationLogEntry } from '@/types/coordination';
import type { DiscoveryContext } from '@/types/discovery-types';
import type { SimpleWorkflow } from '@/types/workflow';

import type { ResolvedStageLLMs } from '../support/environment';

export type SubgraphName = 'responder' | 'discovery' | 'builder' | 'configurator';

/**
 * Pre-computed state extracted from a dataset example.
 * Contains all fields needed to run a subgraph without re-running upstream phases.
 */
export interface PreComputedState {
	messages: BaseMessage[];
	coordinationLog: CoordinationLogEntry[];
	workflowJSON: SimpleWorkflow;
	discoveryContext?: DiscoveryContext | null;
	previousSummary?: string;
}

export interface SubgraphResult {
	/** The text response (for responder subgraph) */
	response?: string;
	/** The workflow output (for builder/configurator subgraphs) */
	workflow?: SimpleWorkflow;
}

export type SubgraphRunFn = (state: PreComputedState) => Promise<SubgraphResult>;

interface SubgraphRunnerConfig {
	subgraph: SubgraphName;
	llms: ResolvedStageLLMs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deserialize messages from dataset JSON into BaseMessage instances.
 * Dataset messages are stored as plain objects with `type` and `content` fields.
 */
export function deserializeMessages(raw: unknown[]): BaseMessage[] {
	return raw.map((m) => {
		if (!isRecord(m)) throw new Error('Invalid message format: expected object');
		const type = m.type as string;
		const content = (m.content as string) ?? '';
		switch (type) {
			case 'human':
				return new HumanMessage(content);
			case 'ai':
				return new AIMessage(content);
			default:
				return new HumanMessage(content);
		}
	});
}

/**
 * Extract pre-computed state from a dataset example's inputs.
 */
export function extractPreComputedState(inputs: Record<string, unknown>): PreComputedState {
	const rawMessages = inputs.messages;
	if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
		throw new Error('Dataset example missing required "messages" field');
	}

	const messages = deserializeMessages(rawMessages);

	const rawCoordinationLog = inputs.coordinationLog;
	if (!Array.isArray(rawCoordinationLog)) {
		throw new Error('Dataset example missing required "coordinationLog" field');
	}

	const rawWorkflow = inputs.workflowJSON;
	if (!isRecord(rawWorkflow)) {
		throw new Error('Dataset example missing required "workflowJSON" field');
	}

	return {
		messages,
		coordinationLog: rawCoordinationLog as CoordinationLogEntry[],
		workflowJSON: rawWorkflow as SimpleWorkflow,
		discoveryContext: isRecord(inputs.discoveryContext)
			? (inputs.discoveryContext as unknown as DiscoveryContext)
			: null,
		previousSummary:
			typeof inputs.previousSummary === 'string' ? inputs.previousSummary : undefined,
	};
}

/**
 * Create a function that runs only the targeted subgraph with pre-computed state.
 *
 * For the responder subgraph: creates the agent via createResponderAgent, invokes it
 * with the pre-computed state, and returns the response text.
 */
export function createSubgraphRunner(config: SubgraphRunnerConfig): SubgraphRunFn {
	const { subgraph, llms } = config;

	switch (subgraph) {
		case 'responder':
			return async (state: PreComputedState): Promise<SubgraphResult> => {
				const agent = createResponderAgent({ llm: llms.responder });

				const context: ResponderContext = {
					messages: state.messages,
					coordinationLog: state.coordinationLog,
					workflowJSON: state.workflowJSON,
					discoveryContext: state.discoveryContext,
					previousSummary: state.previousSummary,
				};

				const result = await invokeResponderAgent(agent, context);
				const { content } = result.response;
				const response = typeof content === 'string' ? content : JSON.stringify(content);

				return { response };
			};

		default:
			throw new Error(
				`Subgraph "${subgraph}" is not yet supported. Currently supported: responder`,
			);
	}
}
