import {
	type AgentMessage,
	type ContextNoteProvider,
	type ContextReminderRetrievalTrace,
	createContextReminderProvider,
	parseAblatedContextReminders,
} from '@n8n/agents';
import type { EmbeddingModel } from 'ai';

import { INTENT_RECOGNITION_REMINDERS } from './intent-recognition.reminders';
import { POST_BUILD_FLOW_REMINDERS } from './post-build-flow.reminders';
import { WORKFLOW_BUILDER_REMINDERS } from './workflow-builder.reminders';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../../tools/tool-ids';

export const INSTANCE_AI_CONTEXT_REMINDER_SETS = [
	WORKFLOW_BUILDER_REMINDERS,
	INTENT_RECOGNITION_REMINDERS,
	POST_BUILD_FLOW_REMINDERS,
];

/**
 * Phases a reminder can wait for.
 * - `after-build`: a workflow was built, verified or run in this conversation.
 * - `editing`: the agent works on saved workflow code (fetched, or built in an
 *   earlier turn or earlier in this turn).
 */
export type InstanceAiReminderPhase = 'after-build' | 'editing';

/** A successful call to one of these means a workflow exists in this conversation. */
const AFTER_BUILD_TOOLS = new Set<string>([
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
	DOMAIN_TOOL_IDS.RUN_WORKFLOW,
	DOMAIN_TOOL_IDS.DEBUG_EXECUTION,
]);

/** A successful call to this means the agent edits saved workflow code. */
const EDITING_TOOLS = new Set<string>([DOMAIN_TOOL_IDS.GET_WORKFLOW_AS_CODE]);

/** Words common to most workflow reminders and steps, which say nothing about which one applies. */
const INSTANCE_AI_STOPWORDS = [
	'workflow',
	'workflows',
	'node',
	'nodes',
	'data',
	'user',
	'users',
	'build',
	'builds',
	'writing',
	'write',
	'sdk',
	'code',
	'json',
];

/** The service adds this block to the user's message text. */
const INSTANCE_AI_INJECTED_TAGS = ['thread-context'];

/** Phases the conversation has reached, from the tools that succeeded so far. */
export function detectInstanceAiReminderPhases(
	messages: readonly AgentMessage[],
): Set<InstanceAiReminderPhase> {
	const phases = new Set<InstanceAiReminderPhase>();
	// The first build of a new workflow is not an edit. A build in an earlier
	// turn means this turn changes a saved workflow.
	let builtBefore = false;
	let builtThisTurn = false;
	for (const message of messages) {
		if (!('role' in message) || !Array.isArray(message.content)) continue;
		if (message.role === 'user') {
			builtBefore ||= builtThisTurn;
			builtThisTurn = false;
		}
		for (const part of message.content) {
			if (part.type !== 'tool-call' || part.state !== 'resolved') continue;
			const name = part.toolName;
			if (AFTER_BUILD_TOOLS.has(name)) phases.add('after-build');
			if (EDITING_TOOLS.has(name)) phases.add('editing');
			if (name === DOMAIN_TOOL_IDS.BUILD_WORKFLOW) {
				// A second build in the same turn changes the workflow the first one saved.
				if (builtThisTurn) phases.add('editing');
				builtThisTurn = true;
			}
		}
	}
	if (builtBefore) phases.add('editing');
	return phases;
}

export interface InstanceAiContextReminderOptions {
	embeddingModel?: EmbeddingModel;
	onRetrieval?: (trace: ContextReminderRetrievalTrace) => void;
	onEmbeddingFailure?: (error: unknown) => void;
}

/**
 * Builds the provider that adds Instance AI context reminders before each
 * model call. Evals can tune it without a code change:
 * `N8N_INSTANCE_AI_CONTEXT_REMINDER_THRESHOLD` sets the score threshold, and
 * `N8N_INSTANCE_AI_CONTEXT_REMINDER_ABLATE=<id>[,<id>…]` (or `*`) leaves out
 * reminders. If the pass rate does not drop without a reminder, delete it.
 */
export function createInstanceAiContextReminderProvider(
	options: InstanceAiContextReminderOptions = {},
): ContextNoteProvider {
	const threshold = Number(process.env.N8N_INSTANCE_AI_CONTEXT_REMINDER_THRESHOLD);
	return createContextReminderProvider({
		sets: INSTANCE_AI_CONTEXT_REMINDER_SETS,
		embeddingModel: options.embeddingModel,
		detectPhases: detectInstanceAiReminderPhases,
		threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : undefined,
		ablate: parseAblatedContextReminders(process.env.N8N_INSTANCE_AI_CONTEXT_REMINDER_ABLATE),
		stopwords: INSTANCE_AI_STOPWORDS,
		injectedTags: INSTANCE_AI_INJECTED_TAGS,
		onRetrieval: options.onRetrieval,
		onEmbeddingFailure: options.onEmbeddingFailure,
	});
}
