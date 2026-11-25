import {
	type AgentMessage,
	type ContextCueProvider,
	type ContextCueSet,
	createContextCueProvider,
	parseAblatedContextCues,
} from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

import { INTENT_RECOGNITION_CUES } from './intent-recognition.cues';
import { getPostBuildFlowCues } from './post-build-flow.cues';
import { getWorkflowBuilderCues } from './workflow-builder.cues';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../../tools/tool-ids';
import { namesEngineV2 } from '../../tools/workflows/target-engine';
import type { InstanceAiEngineSetup } from '../../types';

/** The cue sets for the engines of the instance. */
export function getInstanceAiContextCueSets(engineSetup?: InstanceAiEngineSetup): ContextCueSet[] {
	return [
		getWorkflowBuilderCues(engineSetup),
		INTENT_RECOGNITION_CUES,
		getPostBuildFlowCues(engineSetup),
	];
}

/**
 * Phases a cue can wait for.
 * - `after-build`: a workflow was built, verified or run in this conversation.
 * - `editing`: the agent works on saved workflow code (fetched, or built in an
 *   earlier turn or earlier in this turn).
 * - `v1-build`: the latest primary workflow that was built runs on engine v1. The build
 *   result names engine v2 only when the workflow runs on v2.
 */
export type InstanceAiCuePhase = 'after-build' | 'editing' | 'v1-build';

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

function isSupportingWorkflowOutput(output: unknown): boolean {
	return isRecord(output) && output.isSupportingWorkflow === true;
}

/** Phases the conversation has reached, from the tools that succeeded so far. */
function detectInstanceAiCuePhases(messages: readonly AgentMessage[]): Set<InstanceAiCuePhase> {
	const phases = new Set<InstanceAiCuePhase>();
	// The first build of a new workflow is not an edit. A build in an earlier
	// turn means this turn changes a saved workflow.
	let builtBefore = false;
	let builtThisTurn = false;
	// The engine of the latest primary build. Undefined until a primary build succeeds.
	let latestPrimaryOnV2: boolean | undefined;
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
				if (!isSupportingWorkflowOutput(part.output)) {
					latestPrimaryOnV2 = isRecord(part.output) && namesEngineV2(part.output.targetEngine);
				}
			}
		}
	}
	if (builtBefore) phases.add('editing');
	if (latestPrimaryOnV2 === false) phases.add('v1-build');
	return phases;
}

/**
 * Builds the provider that adds Instance AI context cues before each
 * model call. It ranks cues with BM25.  Evals can tune it without a code change:
 * `N8N_INSTANCE_AI_CONTEXT_CUE_THRESHOLD` sets the score threshold, and
 * `N8N_INSTANCE_AI_CONTEXT_CUE_ABLATE=<id>[,<id>…]` (or `*`) leaves out
 * cues. If the pass rate does not drop without a cue, delete it.
 * With the `engine-v2` module, the workflow builder cues also give the engine v2 way,
 * and the error workflow offer applies only to a workflow that runs on engine v1.
 */
export function createInstanceAiContextCueProvider(
	engineSetup?: InstanceAiEngineSetup,
): ContextCueProvider {
	const threshold = Number(process.env.N8N_INSTANCE_AI_CONTEXT_CUE_THRESHOLD);
	return createContextCueProvider({
		sets: getInstanceAiContextCueSets(engineSetup),
		detectPhases: detectInstanceAiCuePhases,
		threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : undefined,
		ablate: parseAblatedContextCues(process.env.N8N_INSTANCE_AI_CONTEXT_CUE_ABLATE),
		stopwords: INSTANCE_AI_STOPWORDS,
		injectedTags: INSTANCE_AI_INJECTED_TAGS,
	});
}
