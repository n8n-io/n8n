/**
 * Unified sub-agent handoff contract: one typed envelope in (`SubAgentHandoff`),
 * one typed outcome out (`SubAgentOutcome`), one renderer (`renderHandoff`),
 * one observer (`observeOutcome`).
 *
 * `renderHandoff` is prompt-agnostic: each calling tool passes a
 * `HandoffRenderers` bundle that produces the kind-specific sections. This file
 * owns only the generic framing (conversation context, thread state, iteration
 * log) so tool-specific prompts live next to the tools that use them.
 */

import { z } from 'zod';

import { formatPreviousAttempts, type IterationLog } from '../storage/iteration-log';
import type { WorkSummary } from '../stream/work-summary-accumulator';
import type { WorkflowBuildOutcome } from '../workflow-loop';

const resourceIdentitySchema = z.object({
	workflowId: z.string().optional(),
	credentialId: z.string().optional(),
	dataTableId: z.string().optional(),
});

const credentialFieldSchema = z.object({
	name: z.string(),
	displayName: z.string(),
	type: z.string(),
	required: z.boolean(),
	description: z.string().optional(),
});

const availableCredentialSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
});
export type AvailableCredential = z.infer<typeof availableCredentialSchema>;

const recentMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	text: z.string(),
});

const plannerBriefingContextSchema = z.object({
	collectedAnswers: z.array(z.string()),
	discoveredResources: z.array(z.string()),
});

export const delegateHandoffInputSchema = z.object({
	role: z.string(),
	instructions: z.string(),
	goal: z.string(),
	toolNames: z.array(z.string()),
	resources: resourceIdentitySchema.optional(),
	artifacts: z.record(z.unknown()).optional(),
	conversationContext: z.string().optional(),
});
export type DelegateHandoffInput = z.infer<typeof delegateHandoffInputSchema>;

/**
 * Default `instructions` for delegate sub-agents spawned by the planner (blueprint,
 * plan tool, detached delegate tasks). The orchestrator-authored `delegate` tool
 * passes its own `instructions`; these paths don't, so a shared default is used.
 *
 * Keep it short and behavioural: what to do, what NOT to do (re-plan, delegate
 * further, narrate steps), and what to return (the values the orchestrator will
 * consume — tool outputs, IDs, findings — not a prose summary of work done).
 */
export const DELEGATE_DEFAULT_INSTRUCTIONS =
	'You are a sub-agent completing a single delegated task with the provided tools. ' +
	'Do not plan new work, delegate further, or narrate your process. ' +
	'When you finish, return the specific outputs the orchestrator needs to proceed — ' +
	'tool results, IDs, values, or findings — not a description of what you did.';

export const builderHandoffInputSchema = z.object({
	goal: z.string(),
	workflowId: z.string().optional(),
	workItemId: z.string(),
	sandboxMode: z.boolean(),
	conversationContext: z.string().optional(),
	/**
	 * Snapshot of credentials available at dispatch time so the builder can skip
	 * its own `credentials(action="list")` call. Omit when the snapshot is
	 * unavailable (service error) — the builder will fall back to listing itself.
	 */
	availableCredentials: z.array(availableCredentialSchema).optional(),
	/** ISO timestamp of when `availableCredentials` was captured. Guides stale-snapshot refresh. */
	credentialsSnapshotAt: z.string().optional(),
});
export type BuilderHandoffInput = z.infer<typeof builderHandoffInputSchema>;

export const researchHandoffInputSchema = z.object({
	goal: z.string(),
	constraints: z.string().optional(),
	conversationContext: z.string().optional(),
});
export type ResearchHandoffInput = z.infer<typeof researchHandoffInputSchema>;

export const dataTableHandoffInputSchema = z.object({
	goal: z.string(),
	conversationContext: z.string().optional(),
});
export type DataTableHandoffInput = z.infer<typeof dataTableHandoffInputSchema>;

export const plannerHandoffInputSchema = z.object({
	recentMessages: z.array(recentMessageSchema),
	guidance: z.string().optional(),
	timeZone: z.string().optional(),
	briefingContext: plannerBriefingContextSchema.optional(),
});
export type PlannerHandoffInput = z.infer<typeof plannerHandoffInputSchema>;

export const browserCredHandoffInputSchema = z.object({
	credentialType: z.string(),
	docsUrl: z.string().optional(),
	requiredFields: z.array(credentialFieldSchema).optional(),
	oauth2CallbackUrl: z.string().optional(),
});
export type BrowserCredHandoffInput = z.infer<typeof browserCredHandoffInputSchema>;

export type SubAgentKind =
	| 'delegate'
	| 'build-workflow'
	| 'research'
	| 'manage-data-tables'
	| 'planner'
	| 'browser-credential-setup';

/** `taskKey` is the planned-task ID (or a generated ID for ad-hoc spawns) and keys iteration history. */
export type SubAgentHandoff =
	| { taskKey: string; kind: 'delegate'; input: DelegateHandoffInput }
	| { taskKey: string; kind: 'build-workflow'; input: BuilderHandoffInput }
	| { taskKey: string; kind: 'research'; input: ResearchHandoffInput }
	| { taskKey: string; kind: 'manage-data-tables'; input: DataTableHandoffInput }
	| { taskKey: string; kind: 'planner'; input: PlannerHandoffInput }
	| { taskKey: string; kind: 'browser-credential-setup'; input: BrowserCredHandoffInput };

/** Kinds the planned-task scheduler can dispatch. */
export type PlannedHandoffKind = 'delegate' | 'build-workflow' | 'manage-data-tables' | 'research';
export type PlannedHandoff = Extract<SubAgentHandoff, { kind: PlannedHandoffKind }>;

export interface SubAgentOutcomeBase {
	taskKey: string;
	status: 'completed' | 'failed' | 'cancelled';
	resultText: string;
	durationMs: number;
	toolCallCount: number;
	toolErrorCount: number;
	blockers?: string[];
	stoppingReason?: string;
}

export type SubAgentOutcome =
	| (SubAgentOutcomeBase & { kind: 'delegate' })
	| (SubAgentOutcomeBase & { kind: 'build-workflow'; payload: WorkflowBuildOutcome })
	| (SubAgentOutcomeBase & { kind: 'research' })
	| (SubAgentOutcomeBase & { kind: 'manage-data-tables' })
	| (SubAgentOutcomeBase & { kind: 'planner'; planSubmitted: boolean })
	| (SubAgentOutcomeBase & { kind: 'browser-credential-setup' });

/** Minimal runtime slice the renderer pulls from `OrchestrationContext`. */
export interface HandoffRenderContext {
	threadId: string;
	iterationLog?: IterationLog;
	getRunningTaskSummaries?: () => Array<{ taskId: string; role: string; goal?: string }>;
}

/**
 * Kind-specific prompt pieces supplied by the calling tool. Keeps the prompt
 * strings co-located with the tool that owns the sub-agent instead of in
 * `handoff.ts`. `buildTaskBlock` is required so a tool cannot skip producing
 * the main `<task>` block.
 */
export interface HandoffRenderers<H extends SubAgentHandoff = SubAgentHandoff> {
	buildTaskBlock: (handoff: H) => string;
	buildArtifacts?: (handoff: H) => Record<string, unknown> | undefined;
	buildRequirements?: (handoff: H) => string | undefined;
}

/** Render a handoff into the XML briefing string the child consumes via `Agent.stream()`. */
export async function renderHandoff<H extends SubAgentHandoff>(
	handoff: H,
	ctx: HandoffRenderContext,
	renderers: HandoffRenderers<H>,
): Promise<string> {
	const parts: string[] = [];

	parts.push(`<task>\n${renderers.buildTaskBlock(handoff)}\n</task>`);

	const conversationContext = extractConversationContext(handoff);
	if (conversationContext) {
		parts.push(`<conversation-context>\n${conversationContext}\n</conversation-context>`);
	}

	const artifacts = renderers.buildArtifacts?.(handoff);
	if (artifacts && Object.keys(artifacts).length > 0) {
		parts.push(`<artifacts>\n${JSON.stringify(artifacts)}\n</artifacts>`);
	}

	const requirements = renderers.buildRequirements?.(handoff);
	if (requirements) {
		parts.push(requirements);
	}

	const runningTasks = ctx.getRunningTaskSummaries?.() ?? [];
	if (runningTasks.length > 0) {
		const lines = runningTasks
			.map(
				(t) =>
					`  <running-task taskId="${t.taskId}" role="${t.role}">${t.goal ?? ''}</running-task>`,
			)
			.join('\n');
		parts.push(`<thread-state>\n${lines}\n</thread-state>`);
	}

	if (ctx.iterationLog) {
		try {
			const entries = await ctx.iterationLog.getForTask(ctx.threadId, handoff.taskKey);
			const formatted = formatPreviousAttempts(entries);
			if (formatted) parts.push(formatted);
		} catch {
			// Best effort — iteration log is never load-bearing for the briefing.
		}
	}

	return parts.join('\n\n');
}

/** Read `conversationContext` off any handoff input that carries it — no kind dispatch. */
function extractConversationContext(h: SubAgentHandoff): string | undefined {
	if ('conversationContext' in h.input && typeof h.input.conversationContext === 'string') {
		return h.input.conversationContext;
	}
	return undefined;
}

/** UI-facing plan item shape; byte-identical to `plannedTaskArgSchema` in `@n8n/api-types`. */
export interface PlannedTaskArg {
	id: string;
	title: string;
	kind: PlannedHandoffKind | 'checkpoint';
	spec: string;
	deps: string[];
	tools?: string[];
	workflowId?: string;
}

export function toSpecString(handoff: PlannedHandoff): string {
	switch (handoff.kind) {
		case 'delegate':
		case 'build-workflow':
		case 'manage-data-tables':
			return handoff.input.goal;
		case 'research':
			return handoff.input.constraints ?? handoff.input.goal;
	}
}

export function toPlannedTaskArg(
	task: {
		id: string;
		title: string;
		deps: string[];
		tools?: string[];
	} & (
		| { kind: 'checkpoint'; spec: string }
		| { kind?: PlannedHandoffKind; handoff: PlannedHandoff }
	),
): PlannedTaskArg {
	if (task.kind === 'checkpoint') {
		return {
			id: task.id,
			title: task.title,
			kind: 'checkpoint',
			spec: task.spec,
			deps: task.deps,
			...(task.tools ? { tools: task.tools } : {}),
		};
	}

	const workflowId =
		task.handoff.kind === 'build-workflow' ? task.handoff.input.workflowId : undefined;
	return {
		id: task.id,
		title: task.title,
		kind: task.handoff.kind,
		spec: toSpecString(task.handoff),
		deps: task.deps,
		...(task.tools ? { tools: task.tools } : {}),
		...(workflowId ? { workflowId } : {}),
	};
}

export interface ObserveOutcomeInput {
	taskKey: string;
	workSummary: WorkSummary;
	resultText: string;
	startTime: number;
	error?: string;
	status?: 'completed' | 'failed' | 'cancelled';
}

/** Build the base outcome fields from the work summary; callers add kind-specific payload. */
export function observeOutcome(input: ObserveOutcomeInput): SubAgentOutcomeBase {
	const status = input.status ?? (input.error ? 'failed' : 'completed');
	const durationMs = Date.now() - input.startTime;
	const blockers = input.workSummary.toolCalls
		.filter((c) => !c.succeeded && c.errorSummary)
		.map((c) => `${c.toolName}: ${c.errorSummary}`);

	return {
		taskKey: input.taskKey,
		status,
		resultText: input.resultText,
		toolCallCount: input.workSummary.totalToolCalls,
		toolErrorCount: input.workSummary.totalToolErrors,
		durationMs,
		...(input.error ? { stoppingReason: input.error } : {}),
		...(blockers.length > 0 ? { blockers } : {}),
	};
}
