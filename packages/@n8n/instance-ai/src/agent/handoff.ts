/**
 * Unified sub-agent handoff contract: one typed envelope in (`SubAgentHandoff`),
 * one typed outcome out (`SubAgentOutcome`), one renderer (`renderHandoff`),
 * one observer (`observeOutcome`).
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

const recentMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	text: z.string(),
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

export const builderHandoffInputSchema = z.object({
	goal: z.string(),
	workflowId: z.string().optional(),
	workItemId: z.string(),
	sandboxMode: z.boolean(),
	conversationContext: z.string().optional(),
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

/** Render a handoff into the XML briefing string the child consumes via `Agent.stream()`. */
export async function renderHandoff(
	handoff: SubAgentHandoff,
	ctx: HandoffRenderContext,
): Promise<string> {
	const parts: string[] = [];

	parts.push(`<task>\n${taskBlockFor(handoff)}\n</task>`);

	const conversationContext = conversationContextFor(handoff);
	if (conversationContext) {
		parts.push(`<conversation-context>\n${conversationContext}\n</conversation-context>`);
	}

	const artifacts = artifactsFor(handoff);
	if (artifacts && Object.keys(artifacts).length > 0) {
		parts.push(`<artifacts>\n${JSON.stringify(artifacts)}\n</artifacts>`);
	}

	const requirements = requirementsFor(handoff);
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

function taskBlockFor(h: SubAgentHandoff): string {
	switch (h.kind) {
		case 'delegate':
			return h.input.goal;
		case 'build-workflow':
			return renderBuilderTask(h.input);
		case 'research':
			return renderResearchTask(h.input);
		case 'manage-data-tables':
			return h.input.goal;
		case 'planner':
			return renderPlannerTask(h.input);
		case 'browser-credential-setup':
			return renderBrowserCredTask(h.input);
	}
}

function conversationContextFor(h: SubAgentHandoff): string | undefined {
	switch (h.kind) {
		case 'delegate':
		case 'build-workflow':
		case 'research':
		case 'manage-data-tables':
			return h.input.conversationContext;
		default:
			return undefined;
	}
}

function artifactsFor(h: SubAgentHandoff): Record<string, unknown> | undefined {
	if (h.kind !== 'delegate') return undefined;
	const merged: Record<string, unknown> = { ...(h.input.artifacts ?? {}) };
	if (h.input.resources) {
		for (const [k, v] of Object.entries(h.input.resources)) {
			if (v !== undefined) merged[k] = v;
		}
	}
	return Object.keys(merged).length > 0 ? merged : undefined;
}

function requirementsFor(h: SubAgentHandoff): string | undefined {
	if (h.kind === 'build-workflow' && h.input.sandboxMode) {
		return DETACHED_BUILDER_REQUIREMENTS;
	}
	return undefined;
}

function renderBuilderTask(input: BuilderHandoffInput): string {
	const lines: string[] = [input.goal];
	if (input.sandboxMode) {
		lines.push('', `[WORK ITEM ID: ${input.workItemId}]`);
		if (input.workflowId) {
			lines.push(
				`[CONTEXT: Modifying existing workflow ${input.workflowId}. The current code is pre-loaded in ~/workspace/src/workflow.ts — read it first, then edit. Use workflowId "${input.workflowId}" when calling submit-workflow.]`,
			);
		}
	} else if (input.workflowId) {
		lines.push(
			'',
			`[CONTEXT: Modifying existing workflow ${input.workflowId}. Use workflowId "${input.workflowId}" when calling build-workflow.]`,
		);
	}
	return lines.join('\n');
}

function renderResearchTask(input: ResearchHandoffInput): string {
	if (!input.constraints) return input.goal;
	return `${input.goal}\n\nConstraints: ${input.constraints}`;
}

function renderPlannerTask(input: PlannerHandoffInput): string {
	const parts: string[] = [];

	if (input.recentMessages.length > 0) {
		parts.push('## Recent conversation');
		for (const m of input.recentMessages) {
			const label = m.role === 'user' ? 'User' : 'Assistant';
			const content = m.text.length > 2000 ? m.text.slice(0, 2000) + '...' : m.text;
			parts.push(`**${label}:** ${content}`);
		}
	}

	if (input.guidance) {
		parts.push(`\n## Orchestrator guidance\n${input.guidance}`);
	}

	parts.push('\nDesign the solution blueprint based on the conversation above.');

	return parts.join('\n\n');
}

function renderBrowserCredTask(input: BrowserCredHandoffInput): string {
	const docsLine = input.docsUrl
		? `**Documentation:** ${input.docsUrl}`
		: '**Documentation:** No URL available — use `research` (action: web-search) to find setup instructions.';

	let fieldsSection = '';
	if (input.requiredFields && input.requiredFields.length > 0) {
		const fieldLines = input.requiredFields.map((f) => {
			const req = f.required ? ' [REQUIRED]' : '';
			const desc = f.description ? ': ' + f.description : '';
			return `- ${f.displayName} (${f.name})${req}${desc}`;
		});
		fieldsSection = `\n### Required Fields\n${fieldLines.join('\n')}`;
	}

	const isOAuth = input.credentialType.toLowerCase().includes('oauth');
	const oauthSection =
		isOAuth && input.oauth2CallbackUrl
			? `\n### OAuth Redirect URL\n${input.oauth2CallbackUrl}\n` +
				'Paste this into the "Authorized redirect URIs" field. ' +
				'Do NOT navigate to the n8n instance to find it — use this URL directly.'
			: '';

	return [
		`## Credential Setup: ${input.credentialType}`,
		'',
		docsLine,
		fieldsSection,
		oauthSection,
		'',
		'### Completion Criteria',
		'Done ONLY when all required values are visible on screen or downloaded, and you have called `pause-for-user` telling the user what to copy.',
	]
		.filter(Boolean)
		.join('\n');
}

/** UI-facing plan item shape; byte-identical to `plannedTaskArgSchema` in `@n8n/api-types`. */
export interface PlannedTaskArg {
	id: string;
	title: string;
	kind: PlannedHandoffKind;
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

export function toPlannedTaskArg(task: {
	id: string;
	title: string;
	deps: string[];
	tools?: string[];
	handoff: PlannedHandoff;
}): PlannedTaskArg {
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

// Kept in sync with `UNTESTABLE_TRIGGERS` in `build-workflow-agent.tool.ts`;
// hardcoded to avoid a circular import.
const UNTESTABLE_TRIGGER_LABELS = 'webhook, form, mcp, chat';

const DETACHED_BUILDER_REQUIREMENTS = `## Detached Task Contract

You are running as a detached background task. Do not stop after a successful submit — verify the workflow works.

### Completion criteria

Your job is done when ONE of these is true:
- the workflow is verified (ran successfully)
- the workflow uses only event triggers (${UNTESTABLE_TRIGGER_LABELS}) and cannot be runtime-tested — stop after a successful submit. Do NOT publish it; the orchestrator will handle setup and publishing.
- you are blocked after one repair attempt per unique failure

### Submit discipline

**Every file edit MUST be followed by submit-workflow before you do anything else.**
The system tracks file hashes. If you edit the code and then call run-workflow or finish without re-submitting, your work is discarded. The sequence is always: edit → submit → then verify/run.

### Verification

- If submit-workflow returned mocked credentials, call verify-built-workflow with the workItemId
- Otherwise call run-workflow to test (skip for trigger-only workflows). For event-based triggers (Linear, GitHub, Slack, etc.), pass \`inputData\` with sample data matching the trigger's expected output shape — the system injects it as the trigger node's output.
- If verification fails, call debug-execution, fix the code, re-submit, and retry once
- If the same failure signature repeats, stop and explain the block

### Resource discovery

Before writing code that uses external services, **resolve real resource IDs**:
- Call explore-node-resources for any parameter with searchListMethod (calendars, spreadsheets, channels, models, etc.)
- Do NOT use "primary", "default", or any assumed identifier — look up the actual value
- Call get-suggested-nodes early if the workflow fits a known category (web_app, form_input, data_persistence, etc.) — the pattern hints prevent common mistakes
- Check @builderHint annotations in node type definitions for critical configuration guidance

### Publishing

Do NOT call \`publish-workflow\` for the main workflow. Publishing is the user's decision after testing. Your job ends at a successful submit. The only exception is sub-workflows in the compositional pattern — those must be published so the parent workflow can reference them.
`;
