import {
	type AgentMessage,
	type ContextCueProvider,
	createContextCueProvider,
	parseAblatedContextCues,
} from '@n8n/agents';

import { INTENT_RECOGNITION_CUES } from './intent-recognition.cues';
import { POST_BUILD_FLOW_CUES } from './post-build-flow.cues';
import { WORKFLOW_BUILDER_CUES } from './workflow-builder.cues';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../../tools/tool-ids';

export const INSTANCE_AI_CONTEXT_CUE_SETS = [
	WORKFLOW_BUILDER_CUES,
	INTENT_RECOGNITION_CUES,
	POST_BUILD_FLOW_CUES,
];

/**
 * Phases a cue can wait for.
 * - `after-build`: a workflow was built, verified or run in this conversation.
 * - `editing`: the agent works on saved workflow code (fetched, or built in an
 *   earlier turn or earlier in this turn).
 */
export type InstanceAiCuePhase = 'after-build' | 'editing';

/** A successful call to one of these means a workflow exists in this conversation. */
const AFTER_BUILD_TOOLS = new Set<string>([
	DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
	ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
	DOMAIN_TOOL_IDS.RUN_WORKFLOW,
	DOMAIN_TOOL_IDS.DEBUG_EXECUTION,
]);

/** A successful call to this means the agent edits saved workflow code. */
const EDITING_TOOLS = new Set<string>([DOMAIN_TOOL_IDS.GET_WORKFLOW_AS_CODE]);

/** Words common to most workflow cues and steps, which say nothing about which one applies. */
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

function isFailedOutput(output: unknown): boolean {
	return (
		typeof output === 'object' && output !== null && 'success' in output && output.success === false
	);
}

/** Phases the conversation has reached, from the tools that succeeded so far. */
function detectInstanceAiCuePhases(messages: readonly AgentMessage[]): Set<InstanceAiCuePhase> {
	const phases = new Set<InstanceAiCuePhase>();
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
			if (part.type !== 'tool-call' || part.state !== 'resolved' || part.canceled) continue;
			// Denied or failed calls report `success: false` and change no workflow.
			if (isFailedOutput(part.output)) continue;
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

/**
 * Builds the provider that adds Instance AI context cues before each
 * model call. It ranks cues with BM25.  Evals can tune it without a code change:
 * `N8N_INSTANCE_AI_CONTEXT_CUE_THRESHOLD` sets the score threshold, and
 * `N8N_INSTANCE_AI_CONTEXT_CUE_ABLATE=<id>[,<id>…]` (or `*`) leaves out
 * cues. If the pass rate does not drop without a cue, delete it.
 */
export function createInstanceAiContextCueProvider(): ContextCueProvider {
	const threshold = Number(process.env.N8N_INSTANCE_AI_CONTEXT_CUE_THRESHOLD);
	return createContextCueProvider({
		sets: INSTANCE_AI_CONTEXT_CUE_SETS,
		detectPhases: detectInstanceAiCuePhases,
		threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : undefined,
		ablate: parseAblatedContextCues(process.env.N8N_INSTANCE_AI_CONTEXT_CUE_ABLATE),
		stopwords: INSTANCE_AI_STOPWORDS,
		injectedTags: INSTANCE_AI_INJECTED_TAGS,
	});
}
