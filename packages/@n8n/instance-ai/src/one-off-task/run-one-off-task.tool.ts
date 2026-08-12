/**
 * `run-one-off-task` — orchestration tool that delegates a one-off task to an
 * ephemeral pi sandbox (see `docs/one-off-task-sandboxes.md`).
 *
 * Thin wrapper per the module rules: validates input, drives the
 * `OneOffTaskSandbox` / `OneOffTaskCredentialResolver` contracts, returns a
 * structured outcome. Prompt serialization, credential injection, redaction,
 * and event translation live in their own unit-tested modules next to this
 * file.
 *
 * Lifecycle rule (the security core): the sandbox holds decrypted
 * credentials, so it is destroyed in `finally` on every terminal path —
 * completed, failed, interrupted, abort, and thrown errors. The single
 * exception is `needs_credential`: the sandbox stays alive through the
 * human-in-the-loop credential wait so the relaunch can resume pi's session;
 * the lifecycle owner enforces the wait timeout as the backstop.
 */
import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { ORCHESTRATION_TOOL_IDS } from '../tools/tool-ids';
import type { OrchestrationContext } from '../types';
import {
	harnessReportSchema,
	ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS,
	type HarnessReport,
	type OneOffTaskContract,
	type OneOffTaskCredentialResolver,
	type OneOffTaskSandbox,
	type OneOffTaskSandboxProvider,
} from './contracts';
import {
	resolveTaskCredentials,
	withHarnessLlmEnv,
	type ResolvedTaskSecrets,
} from './credential-injection';
import { createPiEventTranslator } from './event-translation';
import { formatOneOffTaskPrompt } from './prompt-formatter';
import { scrubDeep, type ScrubSecret } from './redaction';

export type { OneOffTaskSandboxProvider } from './contracts';

// TODO: register one-off task telemetry (task started, credentials
// requested/approved, task completed/failed/timed out, tokens spent) through
// the @n8n/telemetry registry — follow the n8n:telemetry skill.

export const RUN_ONE_OFF_TASK_TOOL_ID = ORCHESTRATION_TOOL_IDS.RUN_ONE_OFF_TASK;

export const CREDENTIAL_WAIT_TIMEOUT_MINUTES = ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS / 60_000;

export const INTERRUPTED_SUMMARY =
	'Task interrupted — external state unknown. The harness stopped without a valid report, ' +
	'so some external changes may or may not have been made. The streamed task activity shows ' +
	'what ran before the stop; tell the user to check the affected resources.';

// ── Sandbox provisioning boundary ────────────────────────────────────────────

export interface OneOffTaskToolDeps {
	sandboxProvider: OneOffTaskSandboxProvider;
	credentialResolver: OneOffTaskCredentialResolver;
	/**
	 * Env vars pi needs for model access inside the sandbox, e.g.
	 * `{ ANTHROPIC_API_KEY: '…' }` (design doc, "LLM access for the harness").
	 * The harness runs its own LLM loop, so without these it fails on its
	 * first step. Injected per-exec exactly like task credentials, and treated
	 * as secrets by both redaction layers (scrub list + secrets manifest,
	 * label = env var name). When absent or empty the tool fails fast without
	 * creating a sandbox.
	 */
	harnessLlm?: { envVars: Record<string, string> };
}

export const HARNESS_LLM_MISSING_REASON =
	'one-off tasks require harness model access; none is configured';

export const USER_DECLINED_CREDENTIALS_REASON =
	'user declined credential access; nothing was decrypted and no sandbox was created';

// ── Input schema ─────────────────────────────────────────────────────────────

const credentialSelectionSchema = z.object({
	credentialId: z.string().describe('ID of a credential the user approved for this task'),
	name: z.string().describe('Credential display name (from the credentials tool)'),
	type: z.string().describe('Credential type (e.g. "googleSheetsOAuth2Api")'),
});

const inputSchema = sanitizeInputSchema(
	z.object({
		goal: z.string().describe('What to accomplish, in user terms. One task, concretely stated.'),
		constraints: z
			.array(z.string())
			.default([])
			.describe(
				'Hard constraints for the task, e.g. "read-only: do not create, modify, or delete anything". Default to read-only whenever the task allows it.',
			),
		verification: z
			.string()
			.describe(
				'What read-back verification must show for the task to count as done (e.g. "the sheet exists and has the 4 requested columns").',
			),
		credentials: z
			.array(credentialSelectionSchema)
			.default([])
			.describe(
				'Credentials to decrypt and inject into the task environment. Only credentials the user explicitly approved for this task. On relaunch, pass the full list again including the newly approved credential.',
			),
		credentialCatalog: z
			.array(z.object({ name: z.string(), type: z.string() }))
			.default([])
			.describe(
				'Names/types of further credentials the user could approve, so the task requests by name instead of guessing. Never include IDs or values.',
			),
		priorReport: z
			.string()
			.optional()
			.describe(
				'Report from a previous one-off task, as context for a follow-up. Also used on relaunch to carry the progress summary. Never contains secrets.',
			),
		resume: z
			.object({
				sandboxRef: z.string().describe('sandboxRef from the needs_credential outcome'),
				sessionId: z.string().describe('sessionId from the needs_credential outcome'),
				approvedCredentialIds: z
					.array(z.string())
					.default([])
					.describe(
						'approvedCredentialIds from the needs_credential outcome — the credentials the user already approved for this task. The tool asks the user to approve only credentials not in this list.',
					),
			})
			.optional()
			.describe(
				'Relaunch a task that paused with needs_credential: reuses the still-active sandbox and resumes the harness session. Omit for a fresh task.',
			),
	}),
);

type Input = z.infer<typeof inputSchema>;

// ── Credential approval gate (suspend/resume) ────────────────────────────────

/**
 * Per-task credential injection approval, enforced in the tool (design doc:
 * "Explicit approval per credential is the consent mechanism — do not skip
 * it, even when the need is obvious"). The suspend payload follows the same
 * conventions as `credentials.tool.ts`, so it renders as the standard
 * confirmation approval card on this tool call.
 */
const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const resumeSchema = z.object({
	approved: z.boolean(),
});

export interface OneOffTaskToolContext {
	resumeData: z.infer<typeof resumeSchema> | undefined | null;
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>;
}

// ── Outcomes ─────────────────────────────────────────────────────────────────

type CompletedReport = Extract<HarnessReport, { status: 'completed' }>;
type NeedsCredentialReport = Extract<HarnessReport, { status: 'needs_credential' }>;
type FailedReport = Extract<HarnessReport, { status: 'failed' }>;

export type OneOffTaskOutcome =
	| {
			outcome: 'completed';
			sessionId: string;
			report: Omit<CompletedReport, 'status'>;
	  }
	| {
			outcome: 'needs_credential';
			sessionId: string;
			sandboxRef: string;
			/** Credentials already user-approved for this task; pass back on relaunch. */
			approvedCredentialIds: string[];
			progressSummary: string;
			request: NeedsCredentialReport['request'];
			guidance: string;
	  }
	| {
			outcome: 'failed';
			sessionId: string;
			reason: string;
			actions: FailedReport['actions'];
	  }
	| {
			outcome: 'interrupted';
			sessionId: string;
			summary: string;
	  };

/**
 * Scrub + revalidate a harness report in one step: `scrubDeep` walks every
 * string, and re-parsing keeps the result typed without casts. An invalid
 * report comes back `undefined` — the caller treats it as an unclean stop.
 */
function scrubReport(report: unknown, secrets: ScrubSecret[]): HarnessReport | undefined {
	if (report === undefined) return undefined;
	const parsed = harnessReportSchema.safeParse(scrubDeep(report, secrets));
	return parsed.success ? parsed.data : undefined;
}

function interpretReport(
	report: HarnessReport | undefined,
	ids: { sessionId: string; sandboxRef: string; approvedCredentialIds: string[] },
): OneOffTaskOutcome {
	if (report === undefined) {
		return { outcome: 'interrupted', sessionId: ids.sessionId, summary: INTERRUPTED_SUMMARY };
	}
	switch (report.status) {
		case 'completed':
			return {
				outcome: 'completed',
				sessionId: ids.sessionId,
				report: {
					summary: report.summary,
					actions: report.actions,
					verification: report.verification,
					artifacts: report.artifacts,
				},
			};
		case 'needs_credential':
			return {
				outcome: 'needs_credential',
				sessionId: ids.sessionId,
				sandboxRef: ids.sandboxRef,
				approvedCredentialIds: ids.approvedCredentialIds,
				progressSummary: report.progressSummary,
				request: report.request,
				guidance:
					'The task is paused; its sandbox stays active but will be destroyed if not relaunched ' +
					`within ${CREDENTIAL_WAIT_TIMEOUT_MINUTES} minutes. For an existing credential, look up its ` +
					'id via the credentials tool (action="list"); for a new one, run the setup flow ' +
					'(action="setup") with the recipe from `request`. Then call run-one-off-task again with ' +
					'resume: { sandboxRef, sessionId, approvedCredentialIds } from this result, the full ' +
					'credentials list including the new credential (the tool itself asks the user to approve ' +
					'injecting only the new one), and progressSummary as priorReport.',
			};
		case 'failed':
			return {
				outcome: 'failed',
				sessionId: ids.sessionId,
				reason: report.reason,
				actions: report.actions,
			};
	}
}

// ── Execution ────────────────────────────────────────────────────────────────

function truncateGoal(text: string, maxLen = 100): string {
	const firstLine = text.split(/[.\n]/)[0].trim();
	return firstLine.length <= maxLen ? firstLine : firstLine.slice(0, maxLen) + '…';
}

async function acquireSandbox(
	deps: OneOffTaskToolDeps,
	resume: Input['resume'],
): Promise<{ sandbox: OneOffTaskSandbox; sandboxRef: string }> {
	if (resume) {
		return {
			sandbox: await deps.sandboxProvider.reattach(resume.sandboxRef),
			sandboxRef: resume.sandboxRef,
		};
	}
	return await deps.sandboxProvider.create();
}

export async function executeOneOffTask(
	context: OrchestrationContext,
	deps: OneOffTaskToolDeps,
	input: Input,
	ctx: OneOffTaskToolContext,
): Promise<OneOffTaskOutcome> {
	const sessionId = input.resume?.sessionId ?? randomUUID();
	const agentId = `agent-one-off-task-${sessionId.slice(0, 8)}`;
	const isRelaunch = input.resume !== undefined;

	// Fail fast before any provisioning: a harness without model access cannot
	// run a single step, so a sandbox must never be created (or relaunched)
	// for it.
	const harnessLlmEnvVars = deps.harnessLlm?.envVars ?? {};
	if (Object.keys(harnessLlmEnvVars).length === 0) {
		return { outcome: 'failed', sessionId, reason: HARNESS_LLM_MISSING_REASON, actions: [] };
	}

	// Per-task credential injection approval, before anything is decrypted or
	// provisioned. On relaunch only credentials not already approved in this
	// task need a card — a re-approved-nothing relaunch must not burn the
	// credential wait timeout on a pointless prompt.
	const previouslyApproved = new Set(input.resume?.approvedCredentialIds ?? []);
	const credentialsNeedingApproval = isRelaunch
		? input.credentials.filter((credential) => !previouslyApproved.has(credential.credentialId))
		: input.credentials;

	if (credentialsNeedingApproval.length > 0) {
		if (ctx.resumeData === undefined || ctx.resumeData === null) {
			const credentialList = credentialsNeedingApproval
				.map((credential) => `${credential.name} (${credential.type})`)
				.join(', ');
			return await ctx.suspend({
				requestId: nanoid(),
				message:
					'This task will decrypt and inject these credentials into an ephemeral sandbox ' +
					`to complete it: ${credentialList}. Values are injected only into the task process ` +
					'and the sandbox is destroyed when the task ends.',
				severity: 'warning' as const,
			});
		}
		if (!ctx.resumeData.approved) {
			return {
				outcome: 'failed',
				sessionId,
				reason: USER_DECLINED_CREDENTIALS_REASON,
				actions: [],
			};
		}
	}

	// Resolve credentials before provisioning: an access denial must not leak
	// a sandbox. On relaunch a denial leaves the existing sandbox to the wait
	// timeout, same as a user who never answers.
	let resolved: ResolvedTaskSecrets;
	try {
		resolved = await resolveTaskCredentials(deps.credentialResolver, input.credentials, {
			userId: context.userId,
			...(context.projectId ? { projectId: context.projectId } : {}),
		});
	} catch (error) {
		if (error instanceof UserError) {
			return {
				outcome: 'failed',
				sessionId,
				reason: `Credential injection failed: ${error.message}`,
				actions: [],
			};
		}
		throw error;
	}

	// The harness's model key rides along on every launch and relaunch, under
	// both redaction layers, but never enters the task contract.
	resolved = withHarnessLlmEnv(resolved, harnessLlmEnvVars);

	const contract: OneOffTaskContract = {
		goal: input.goal,
		constraints: input.constraints,
		verification: input.verification,
		credentials: resolved.injectedCredentials,
		credentialCatalog: input.credentialCatalog,
		...(input.priorReport !== undefined ? { priorReport: input.priorReport } : {}),
	};

	const { sandbox, sandboxRef } = await acquireSandbox(deps, input.resume);

	const publish = (event: Parameters<typeof context.eventBus.publish>[1]): void => {
		context.eventBus.publish(context.threadId, event);
	};

	if (isRelaunch) {
		publish({
			type: 'status',
			runId: context.runId,
			agentId,
			payload: { message: 'Resuming the task with the new credential…' },
		});
	} else {
		publish({
			type: 'agent-spawned',
			runId: context.runId,
			agentId,
			payload: {
				parentId: context.orchestratorAgentId,
				role: 'one-off-task',
				tools: [],
				title: 'Running one-off task',
				subtitle: truncateGoal(input.goal),
				goal: input.goal,
			},
		});
	}

	let keepSandboxAlive = false;
	try {
		// Bootstrap on relaunch too: it rewrites the secrets manifest so the
		// in-sandbox redactor also knows the newly injected values (workstream
		// B's bootstrap is idempotent — the pinned pi install is a no-op).
		await sandbox.bootstrap(resolved.manifest);

		const translator = createPiEventTranslator({
			runId: context.runId,
			agentId,
			secrets: resolved.scrubSecrets,
			publish,
		});

		const result = await sandbox.runHarness({
			prompt: formatOneOffTaskPrompt(contract),
			sessionId,
			env: resolved.env,
			abortSignal: context.abortSignal,
			onEvent: translator,
		});

		const outcome = interpretReport(scrubReport(result.report, resolved.scrubSecrets), {
			sessionId,
			sandboxRef,
			// Everything injected in this run passed the approval gate (or was
			// pre-approved on a relaunch) — the orchestrator round-trips these so
			// the relaunch only asks about genuinely new credentials.
			approvedCredentialIds: input.credentials.map((credential) => credential.credentialId),
		});

		if (outcome.outcome === 'needs_credential') {
			keepSandboxAlive = true;
			publish({
				type: 'status',
				runId: context.runId,
				agentId,
				payload: { message: 'Waiting for credential approval…' },
			});
		} else {
			publish({
				type: 'agent-completed',
				runId: context.runId,
				agentId,
				payload: {
					role: 'one-off-task',
					result:
						outcome.outcome === 'completed'
							? outcome.report.summary
							: outcome.outcome === 'failed'
								? outcome.reason
								: outcome.summary,
					status: outcome.outcome === 'completed' ? 'completed' : 'error',
					...(outcome.outcome === 'completed' ? {} : { error: 'Task did not complete' }),
				},
			});
		}

		return outcome;
	} catch (error) {
		publish({
			type: 'agent-completed',
			runId: context.runId,
			agentId,
			payload: {
				role: 'one-off-task',
				result: INTERRUPTED_SUMMARY,
				status: context.abortSignal.aborted ? 'cancelled' : 'error',
				error: error instanceof Error ? error.message : 'One-off task harness failed',
			},
		});
		throw error;
	} finally {
		if (!keepSandboxAlive) {
			// Terminal path (completed/failed/interrupted/abort/throw): the
			// sandbox holds decrypted credentials and must die with the task.
			try {
				await sandbox.destroy();
			} catch (destroyError) {
				context.logger.error('Failed to destroy one-off task sandbox', {
					sandboxRef,
					error: destroyError instanceof Error ? destroyError.message : String(destroyError),
				});
			}
		}
	}
}

// ── Tool factory ─────────────────────────────────────────────────────────────

export function createRunOneOffTaskTool(context: OrchestrationContext, deps: OneOffTaskToolDeps) {
	return new Tool(RUN_ONE_OFF_TASK_TOOL_ID)
		.description(
			'Run a one-off task (run-once, no workflow needed) in an ephemeral sandbox: a coding harness ' +
				'writes and executes SDK code against the injected credentials, verifies the result by ' +
				'read-back, and returns a structured report. Load the one-off-task skill before first use. ' +
				'Recurring or trigger-driven work belongs in a workflow instead. Pass the credentials the ' +
				'task needs directly — this tool itself asks the user to approve injecting them. On a ' +
				'needs_credential outcome, call this tool again with the returned resume: ' +
				'{ sandboxRef, sessionId, approvedCredentialIds }.',
		)
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (input, ctx) => {
			const parsed = inputSchema.parse(input);
			return await executeOneOffTask(context, deps, parsed, ctx);
		})
		.build();
}
