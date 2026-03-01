/**
 * Workflow regeneration runner.
 *
 * Runs the full multi-agent workflow from a prompt and extracts final state
 * for dataset regeneration purposes.
 */

import type { BaseMessage } from '@langchain/core/messages';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { CoordinationLogEntry } from '@/types/coordination';
import type { DiscoveryContext } from '@/types/discovery-types';
import type { SimpleWorkflow } from '@/types/workflow';

import { consumeGenerator, getChatPayload } from './evaluation-helpers';
import type { EvalLogger } from './logger';
import { generateRunId, isWorkflowStateValues } from '../langsmith/types';
import { EVAL_TYPES, EVAL_USERS } from '../support/constants';
import { createAgent, type ResolvedStageLLMs } from '../support/environment';

/** Serialized message format for JSON storage */
export interface SerializedMessage {
	type: 'human' | 'ai';
	content: string;
}

/** State extracted from a completed workflow generation */
export interface RegeneratedState {
	messages: SerializedMessage[];
	coordinationLog: CoordinationLogEntry[];
	workflowJSON: SimpleWorkflow;
	discoveryContext?: DiscoveryContext | null;
	previousSummary?: string;
}

export interface RegenerateOptions {
	prompt: string;
	llms: ResolvedStageLLMs;
	parsedNodeTypes: INodeTypeDescription[];
	timeoutMs?: number;
	abortSignal?: AbortSignal;
	logger?: EvalLogger;
}

function serializeMessage(msg: BaseMessage): SerializedMessage {
	const msgType = msg._getType();
	return {
		type: msgType === 'human' ? 'human' : 'ai',
		content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
	};
}

/**
 * Run the full multi-agent workflow to generate state from a prompt.
 * Returns the final messages, coordinationLog, and workflowJSON.
 */
export async function regenerateWorkflowState(
	options: RegenerateOptions,
): Promise<RegeneratedState> {
	const { prompt, llms, parsedNodeTypes, abortSignal, logger } = options;

	const runId = generateRunId();

	logger?.verbose(`Regenerating workflow state for prompt: ${prompt.slice(0, 50)}...`);

	const agent = createAgent({
		parsedNodeTypes,
		llms,
	});

	const payload = getChatPayload({
		evalType: EVAL_TYPES.LANGSMITH,
		message: prompt,
		workflowId: runId,
	});

	await consumeGenerator(agent.chat(payload, EVAL_USERS.LANGSMITH, abortSignal));

	const state = await agent.getState(runId, EVAL_USERS.LANGSMITH);

	if (!state.values || !isWorkflowStateValues(state.values)) {
		throw new Error('Invalid workflow state: workflow or messages missing');
	}

	const values = state.values as {
		messages: BaseMessage[];
		workflowJSON: SimpleWorkflow;
		coordinationLog?: CoordinationLogEntry[];
		discoveryContext?: DiscoveryContext | null;
		previousSummary?: string;
	};

	const messages = values.messages.map(serializeMessage);
	const coordinationLog = values.coordinationLog ?? [];
	const workflowJSON = values.workflowJSON;
	const discoveryContext = values.discoveryContext;
	const previousSummary = values.previousSummary;

	logger?.verbose(
		`Regeneration complete: ${messages.length} messages, ${coordinationLog.length} log entries`,
	);

	return {
		messages,
		coordinationLog,
		workflowJSON,
		discoveryContext,
		previousSummary,
	};
}
