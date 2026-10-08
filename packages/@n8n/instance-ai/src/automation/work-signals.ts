import type { SKILL_LOAD_TOOL_NAME } from '@n8n/agents';
import { z } from 'zod';

import type { WorkSignal } from './repeatable-work';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS, WORKSPACE_TOOL_IDS } from '../tools/tool-ids';
import { ONE_OFF_BUILD_SUCCEEDED_REASON } from '../tools/workflows/post-build-flow-reason';

/**
 * The tool that offers to make a workflow automatic. The tool lives in `packages/cli`, which this
 * package cannot import, so the cli ties its own constant to this one at the type level.
 */
export const PROPOSE_AUTOMATION_TOOL_NAME = 'propose_automation';

// Tied to the runtime name at the type level. A value import would load the whole runtime here.
const LOAD_SKILL_TOOL_NAME: typeof SKILL_LOAD_TOOL_NAME = 'load_skill';

const RUN_ACTION = 'run';

/**
 * The Assistant's own tools. Their lookups, builds and set-up steps occur in almost every build
 * chat, so of these tools only the `JOB_SIGNATURES` count as work. A tool that is not in this list
 * (for example an MCP tool) acts outside n8n, so each of its calls counts.
 */
const ASSISTANT_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
	...Object.values(DOMAIN_TOOL_IDS),
	...Object.values(ORCHESTRATION_TOOL_IDS),
	...Object.values(WORKSPACE_TOOL_IDS),
	LOAD_SKILL_TOOL_NAME,
	// The runtime adds these by name: tool search, and the research tools.
	'search_tools',
	'load_tool',
	'web-search',
	'fetch-url',
]);

/** The calls of the Assistant's own tools that do the user's job: they run or write something. */
const JOB_SIGNATURES: ReadonlySet<string> = new Set<string>([
	`${DOMAIN_TOOL_IDS.EXECUTIONS}:${RUN_ACTION}`,
	`${DOMAIN_TOOL_IDS.NODES}:execute`,
	`${DOMAIN_TOOL_IDS.DATA_TABLES}:insert-rows`,
	`${DOMAIN_TOOL_IDS.DATA_TABLES}:update-rows`,
	`${DOMAIN_TOOL_IDS.DATA_TABLES}:delete-rows`,
]);

/** One tool call of a chat, as `collectWorkSignals` reads it. */
export type WorkToolCall = {
	toolName: string;
	action?: string;
	ok: boolean;
	workflowId?: string;
	/** Only on a `build-workflow` call whose result says that a one-off build succeeded. */
	oneOffBuildSucceeded?: boolean;
};

export type WorkSignalsInput = {
	/** The user's own text of each turn, oldest first, without service-injected blocks. */
	userTexts: readonly string[];
	/** The tool calls of the chat, oldest first. */
	toolCalls: readonly WorkToolCall[];
};

type CallWithWorkflow = WorkToolCall & { workflowId: string };

function hasWorkflowId(call: WorkToolCall): call is CallWithWorkflow {
	return call.workflowId !== undefined && call.workflowId !== '';
}

function isOneOffBuild(call: WorkToolCall): call is CallWithWorkflow {
	return (
		call.toolName === DOMAIN_TOOL_IDS.BUILD_WORKFLOW &&
		call.oneOffBuildSucceeded === true &&
		hasWorkflowId(call)
	);
}

function isSuccessfulRun(call: WorkToolCall): call is CallWithWorkflow {
	return (
		call.toolName === DOMAIN_TOOL_IDS.EXECUTIONS &&
		call.action === RUN_ACTION &&
		call.ok &&
		hasWorkflowId(call)
	);
}

function signatureOf({ toolName, action }: Pick<WorkToolCall, 'toolName' | 'action'>): string {
	return `${toolName}:${action ?? ''}`;
}

/**
 * Whether a call does work that the user can want again, so that a repeat of it counts. The
 * Assistant's own `propose_automation` call is not work.
 */
export function isWorkToolCall(call: Pick<WorkToolCall, 'toolName' | 'action'>): boolean {
	if (call.toolName === PROPOSE_AUTOMATION_TOOL_NAME) return false;
	return !ASSISTANT_TOOL_NAMES.has(call.toolName) || JOB_SIGNATURES.has(signatureOf(call));
}

/**
 * Turns a chat into the signals that `assessRepeatableWork` scores. Each user text gives a
 * `user-message` signal. Each call that does work (`isWorkToolCall`) gives a `tool-call` signal,
 * so that lookups and builds never count as repeated work. A one-off build that a later
 * successful run of the same workflow follows gives one `one-off-success` signal, right after
 * that run.
 */
export function collectWorkSignals({ userTexts, toolCalls }: WorkSignalsInput): WorkSignal[] {
	const signals: WorkSignal[] = userTexts.map((text) => ({ kind: 'user-message', text }));
	const oneOffBuilds = new Set<string>();
	let oneOffSucceeded = false;

	for (const call of toolCalls) {
		if (isWorkToolCall(call)) {
			signals.push({ kind: 'tool-call', signature: signatureOf(call), ok: call.ok });
		}
		if (isOneOffBuild(call)) {
			oneOffBuilds.add(call.workflowId);
		} else if (!oneOffSucceeded && isSuccessfulRun(call) && oneOffBuilds.has(call.workflowId)) {
			signals.push({ kind: 'one-off-success', workflowId: call.workflowId });
			oneOffSucceeded = true;
		}
	}
	return signals;
}

/** A field that has an unexpected type reads as absent, so one odd field does not drop the call. */
const lenient = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);

const nonBlankText = z.string().trim().min(1);

/** The parts of a stored tool call that the work signals use. Stored data is never trusted. */
const storedToolCallSchema = z.object({
	type: z.literal('tool-call'),
	toolName: nonBlankText,
	state: z.enum(['pending', 'resolved', 'rejected']),
	canceled: lenient(z.boolean()),
	input: z.object({ action: lenient(nonBlankText), workflowId: lenient(nonBlankText) }).catch({}),
	output: z
		.object({
			success: lenient(z.boolean()),
			ok: lenient(z.boolean()),
			denied: lenient(z.boolean()),
			isError: lenient(z.boolean()),
			status: lenient(z.string()),
			workflowId: lenient(nonBlankText),
			postBuildFlow: lenient(z.object({ reason: z.string() })),
		})
		.catch({}),
});

type StoredToolCall = z.infer<typeof storedToolCallSchema>;

function reportsFailure(output: StoredToolCall['output']): boolean {
	return (
		output.success === false ||
		output.ok === false ||
		output.denied === true ||
		output.isError === true
	);
}

/**
 * A call is ok when it finished and its result reports no failure. A workflow run is ok only when
 * the execution succeeded, as in the automation offer of the editor.
 */
function isOkCall({ toolName, state, canceled, input, output }: StoredToolCall): boolean {
	if (state !== 'resolved' || canceled === true) return false;
	if (toolName === DOMAIN_TOOL_IDS.EXECUTIONS && input.action === RUN_ACTION) {
		return output.status === 'success';
	}
	return !reportsFailure(output);
}

/**
 * Reads one content part of a stored assistant message as a tool call, or returns undefined for
 * any other part. Results are stored on the tool-call part. A build takes its workflow ID from
 * the result, because a new build has none in its input. A run result has no workflow ID, so
 * every other call takes it from the input.
 */
export function readWorkToolCall(part: unknown): WorkToolCall | undefined {
	const parsed = storedToolCallSchema.safeParse(part);
	if (!parsed.success) return undefined;

	const { toolName, input, output } = parsed.data;
	const isBuild = toolName === DOMAIN_TOOL_IDS.BUILD_WORKFLOW;
	const workflowId = isBuild ? output.workflowId : input.workflowId;
	const oneOffBuildSucceeded =
		isBuild && output.postBuildFlow?.reason === ONE_OFF_BUILD_SUCCEEDED_REASON;
	return {
		toolName,
		...(input.action !== undefined ? { action: input.action } : {}),
		ok: isOkCall(parsed.data),
		...(workflowId !== undefined ? { workflowId } : {}),
		...(oneOffBuildSucceeded ? { oneOffBuildSucceeded } : {}),
	};
}
