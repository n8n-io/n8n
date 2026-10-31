import { AgentPlanValidationError } from '../plans/agent-plan.schema';
import { readPlanTaskContext } from '../plans/agent-plan-task-context';
import type { BuiltTool, CreateDelegateSubAgentToolOptions, ToolContext } from '@n8n/agents';
import { INLINE_SUB_AGENT_ID } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { SubAgentSource } from '@n8n/api-types';
import { z } from 'zod';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import { readIntegrationMessageContext } from '../integrations/integration-message-context';
import { isTaskRunMemoryResourceId } from '../utils/agent-memory-scope';
import type { AgentBackgroundJobService } from './agent-background-job.service';
import { EXPIRED_BACKGROUND_CHECKPOINT_ERROR } from './agent-background-job.service';
import { BACKGROUND_JOBS_TOOL_NAME } from './background-job-messages';
import {
	BACKGROUND_PAUSE_USER_TURN_KEY,
	PARENT_TASK_CANCELLED_REASON,
} from './sub-agent-background-state';
import { EXECUTION_METADATA_KEY, hostMetadataExecutionId } from '../types/agent-queued-message';
import type {
	BackgroundSubAgentRunContext,
	SubAgentBackgroundRunner,
} from './sub-agent-background-runner';

/** Cap on the result text echoed to the model; the full text stays on the row. */
const RESULT_ECHO_MAX_CHARS = 8000;

export interface BackgroundJobToolsOptions {
	planTasksEnabled?: boolean;
	jobService: AgentBackgroundJobService;
	backgroundRunner: SubAgentBackgroundRunner;
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents: NonNullable<CreateDelegateSubAgentToolOptions['availableSubAgents']>;
	projectId: string;
	parentAgentId: string;
	// The workspace handle is principal-scoped, not thread-scoped. The sandbox
	// outlives the parent turn, so capture it when the tool is built.
	runContext: BackgroundSubAgentRunContext;
}

/**
 * Everything thread-scoped is read from `ctx.persistence` inside the handlers:
 * agent runtimes (and therefore these tool closures) are cached and shared
 * across threads and users, so anything captured at build time would leak jobs
 * across them.
 */
function threadIdOf(ctx: ToolContext): string | undefined {
	return ctx.persistence?.threadId;
}

export function createBackgroundSubAgentHandler(
	options: BackgroundJobToolsOptions,
): NonNullable<CreateDelegateSubAgentToolOptions['runBackgroundSubAgent']> {
	return async (input, ctx) => {
		// Background job titles must fit the stored varchar(255) value.
		if (input.taskName.length > 255) {
			return { status: 'rejected', note: 'Background task names must not exceed 255 characters.' };
		}
		const parentThreadId = threadIdOf(ctx);
		const parentResourceId = ctx.persistence?.resourceId;
		if (!parentThreadId || !parentResourceId) {
			return {
				status: 'rejected',
				note: 'Background jobs need a persisted conversation thread; none is active.',
			};
		}
		// Task sessions have no chat identity, so a wake cannot deliver their job results.
		if (isTaskRunMemoryResourceId(parentResourceId)) {
			return {
				status: 'rejected',
				note: 'Background jobs are unavailable in task sessions.',
			};
		}

		// Self-delegation runs a copy of this agent: the parent's own id is the
		// source, resolved to its draft or published version by run type.
		const isSelfDelegation = input.subAgentId === INLINE_SUB_AGENT_ID;
		const source = isSelfDelegation
			? { agentId: options.parentAgentId }
			: options.sourcesById[input.subAgentId];
		if (!source) {
			const ids = [...options.availableSubAgents.map((agent) => agent.id), 'inline'].join(', ');
			return {
				status: 'rejected',
				note: `No sub-agent matched "${input.subAgentId}". Available: ${ids}.`,
			};
		}

		const sandboxScope = decodeAgentSandboxHostMetadata(ctx.persistence?.hostMetadata);
		if (!sandboxScope || sandboxScope.projectId !== options.projectId) {
			return {
				status: 'rejected',
				note: 'Background jobs need a valid parent identity; none is active.',
			};
		}
		const parentExecutionId = hostMetadataExecutionId(ctx.persistence?.hostMetadata);
		const inheritedPlanTask = readPlanTaskContext(ctx.persistence?.hostMetadata);
		// Without plan tools no plan exists, so a model-supplied reference can only be stale.
		const planTask = inheritedPlanTask ?? (options.planTasksEnabled ? input.planTask : undefined);
		const receipt = await options.backgroundRunner
			.spawn(
				{
					subAgentId: source.agentId,
					planTask,
					validatePlanTask: options.planTasksEnabled,
					inheritedPlanTask: Boolean(inheritedPlanTask),
					source,
					taskName: input.taskName,
					goal: input.goal,
					context: input.context,
					expectedOutput: input.expectedOutput,
					...(input.fileIds?.length ? { fileIds: input.fileIds } : {}),
					...(isSelfDelegation && input.difficulty !== undefined
						? { difficulty: input.difficulty }
						: {}),
					sourceExecutionId: parentExecutionId,
					parentThreadId,
					...(parentExecutionId !== undefined ? { parentExecutionId } : {}),
					parentResourceId,
					parentSandboxPrincipalHash: sandboxScope.principalHash,
					parentMessageContext: readIntegrationMessageContext(ctx.persistence) ?? null,
				},
				{
					projectId: options.projectId,
					parentAgentId: options.parentAgentId,
					...options.runContext,
				},
			)
			.catch((error: unknown) => {
				if (error instanceof AgentPlanValidationError)
					return { status: 'rejected' as const, note: error.message };

				throw error;
			});

		if (receipt.status === 'rejected') return receipt;

		if (receipt.status === 'started') {
			// Full Stop also cancels detached jobs that start after the cancellation request.
			if (ctx.abortSignal?.reason === PARENT_TASK_CANCELLED_REASON) {
				await options.jobService.cancel(parentThreadId, receipt.jobId);
			}

			return {
				status: 'started',
				jobId: receipt.jobId,
				planTask,
				note: 'Job dispatched. Continue independent work or end this turn with a short progress message. Completion triggers a follow-up. Do not wait, sleep, or poll for completion.',
			};
		}

		return {
			status: 'limit-reached',
			note: 'This conversation already has the maximum number of running background jobs. Wait for one to finish or cancel one.',
		};
	};
}

type BackgroundJobsToolOptions = Pick<
	BackgroundJobToolsOptions,
	'jobService' | 'backgroundRunner' | 'projectId' | 'parentAgentId' | 'runContext'
>;

const backgroundJobsInputSchema = z
	.object({
		action: z
			.enum(['check', 'cancel', 'resume'])
			.describe(
				'check lists jobs, cancel stops one running job, resume continues stopped plan tasks.',
			),
		jobIds: z
			.array(z.string())
			.max(50)
			.optional()
			.describe('check only. Limit the check to these job IDs. Omit to check all jobs.'),
		jobId: z.string().optional().describe('cancel only. Required. The job ID to cancel.'),
		planId: z
			.string()
			.uuid()
			.optional()
			.describe('resume only. The plan ID from the latest plan snapshot.'),
		planTaskIds: z
			.array(z.string().uuid())
			.min(1)
			.optional()
			.describe(
				'resume only. The planTaskId values (the id of each task in the plan) to continue. Requires planId. Omit to continue the whole plan.',
			),
	})
	.refine((input) => input.action !== 'cancel' || input.jobId, {
		message: 'cancel requires jobId.',
		path: ['jobId'],
	})
	.refine((input) => !input.planTaskIds || input.planId, {
		message: 'planTaskIds requires planId.',
		path: ['planId'],
	});

type BackgroundJobsInput = z.infer<typeof backgroundJobsInputSchema>;

/** One tool for all background job operations, so the model sees one complete schema. */
export function createBackgroundJobsTool(options: BackgroundJobsToolOptions): BuiltTool {
	return new Tool(BACKGROUND_JOBS_TOOL_NAME)
		.description(
			'Manage the background jobs of this conversation. ' +
				'action "check" lists the jobs with their status and, once settled, their result, error, and files. ' +
				'action "cancel" cancels one running job by jobId. ' +
				'action "resume" continues stopped plan tasks: pass planId and optional planTaskIds. ' +
				'Without planId, resume uses the saved stopped plan, or the latest stop group if there is no plan.',
		)
		.systemInstruction(
			'Use action "check" at most once per turn, including calls made together. ' +
				'Omit jobIds to check all jobs, or include all relevant job IDs in one call. Use the ' +
				'results already available and continue independent work. If further progress depends ' +
				'on running jobs, end your turn with a short progress message. Completion triggers a ' +
				'follow-up. Do not wait, sleep, or check again in the same turn to see whether ' +
				'a job has finished. A user status request or a completion hint can justify one check ' +
				'in a later turn. Do not claim that running jobs are complete.\n' +
				`Call ${BACKGROUND_JOBS_TOOL_NAME} with action "resume" first when the latest user message explicitly asks to continue stopped tasks. For a plan, pass its planId. For a selective request, pass only the requested planTaskId values in planTaskIds. A group selects its unfinished children. Selected parent-run tasks return to pending or in_progress, based on whether they had started. Unstarted parent-run tasks return to pending even when their prerequisites are unfinished. Paused jobs with unfinished prerequisites stay paused. Continue does not dispatch new work. Do not resume unrelated tasks or prerequisites. Read task statuses from the plan. A new user message does not resume paused tasks. Without a plan, Continue applies to the latest stop group. Do not resume for an unrelated message or an automatic notification. Never replace paused sub-agents with new jobs. If stopping is still in progress, ask the user to wait for the combined report and ask again. Do not poll or remember an early request for automatic continuation. Resume returns cancelled workflow references separately. It does not restart those workflows. Check conversation history and current jobs before repeating a workflow call, including repeated Continue requests. Create a new plan task for a cancelled workflow before calling the normal workflow tool again. Keep the previous task cancelled. A new execution uses current configuration and starts from the beginning. Earlier actions can repeat and webhook URLs change. Continuing does not approve pending tools or bypass permissions.`,
		)
		.input(backgroundJobsInputSchema)
		.handler(async (input, ctx) => {
			if (input.action === 'cancel') return await cancelJob(options, input, ctx);
			if (input.action === 'resume') return await resumeJobs(options, input, ctx);
			return await checkJobs(options, input, ctx);
		})
		.build();
}

async function checkJobs(
	options: BackgroundJobsToolOptions,
	input: BackgroundJobsInput,
	ctx: ToolContext,
) {
	const parentThreadId = threadIdOf(ctx);
	if (!parentThreadId) {
		return { jobs: [], note: 'No persisted conversation thread is active.' };
	}

	const jobs = await options.jobService.listForThread(parentThreadId, input.jobIds);
	await options.jobService.markMailConsumed(
		parentThreadId,
		jobs
			.filter(
				(job) => job.status !== 'running' && job.status !== 'suspended' && !job.pauseRequestId,
			)
			.map((job) => job.id),
	);

	return {
		jobs: jobs.map((job) => ({
			jobId: job.id,
			...(job.planId && job.planTaskId
				? { planTask: { planId: job.planId, planTaskId: job.planTaskId } }
				: {}),
			kind: job.kind,
			title: job.title,
			status: job.status,
			...(job.pauseRequestId ? { userStopped: true } : {}),
			...(job.result !== null ? { result: truncateResult(job.result) } : {}),
			...(job.error !== null ? { error: truncateResult(job.error) } : {}),
			...(job.files?.length ? { files: job.files } : {}),
			...(job.skippedFiles?.length ? { skippedFiles: job.skippedFiles } : {}),
			startedAt: job.createdAt.toISOString(),
			...(job.timeoutAt !== null ? { timeoutAt: job.timeoutAt.toISOString() } : {}),
			...(job.childExecutionId !== null ? { executionId: job.childExecutionId } : {}),
		})),
		runningCount: jobs.filter((job) => job.status === 'running').length,
		note: 'You have checked background jobs for this turn. User-stopped jobs must wait for the combined report and a new explicit request to continue. Do not replace or resume their work automatically. Use other available results. Do not wait, sleep, or check again in this turn.',
	};
}

async function resumeJobs(
	options: BackgroundJobsToolOptions,
	input: BackgroundJobsInput,
	ctx: ToolContext,
) {
	const { persistence } = ctx;
	const executionId = persistence?.hostMetadata?.[EXECUTION_METADATA_KEY];
	const scope = decodeAgentSandboxHostMetadata(persistence?.hostMetadata);

	if (
		!persistence ||
		persistence.hostMetadata?.[BACKGROUND_PAUSE_USER_TURN_KEY] !== true ||
		typeof executionId !== 'string' ||
		scope?.projectId !== options.projectId
	) {
		return {
			status: 'unavailable',
			note: 'Resuming needs an explicit user request in this conversation.',
		};
	}

	const candidates = await options.jobService
		.preparePausedResume(
			options.parentAgentId,
			persistence.threadId,
			persistence.resourceId,
			executionId,
			input.planId ? { planId: input.planId, taskIds: input.planTaskIds } : undefined,
		)
		.catch((error: unknown) => {
			if (error instanceof AgentPlanValidationError)
				return { status: 'rejected' as const, jobs: [], note: error.message };

			throw error;
		});

	if (candidates.status === 'rejected') return { status: candidates.status, note: candidates.note };

	if (candidates.status === 'limit-reached') {
		return {
			status: candidates.status,
			note: 'There are not enough active task slots for the stopped group. Wait for active tasks to finish, then ask to continue again.',
		};
	}

	if (candidates.status === 'expired')
		return { status: candidates.status, note: EXPIRED_BACKGROUND_CHECKPOINT_ERROR };

	if (candidates.status !== 'ready') {
		return {
			status: candidates.status,
			note: 'Wait for the combined status report, then ask to continue again.',
		};
	}

	try {
		const results = await Promise.allSettled(
			candidates.jobs.map(
				async (job) =>
					await options.backgroundRunner.resumePaused(
						job,
						{
							...options.runContext,
							projectId: options.projectId,
							parentAgentId: job.parentAgentId,
						},
						candidates.timeoutAt,
					),
			),
		);

		return {
			status:
				results.some((result) => result.status === 'rejected') || candidates.failed?.length
					? 'partial'
					: candidates.jobs.length > 0
						? 'resumed'
						: 'ready',
			blocked: candidates.blocked,
			failed: candidates.failed,
			jobs: results.map((result, index) => ({
				jobId: candidates.jobs[index].id,
				planTaskId: candidates.jobs[index].planTaskId,
				status: result.status === 'fulfilled' ? 'resumed' : 'failed',
				...(result.status === 'rejected' ? { error: String(result.reason) } : {}),
			})),
			workflowsToRestart: candidates.workflowsToRestart,
		};
	} finally {
		await options.jobService.releaseResumeReservations(candidates.jobs, candidates.timeoutAt);

		if (candidates.selection)
			await options.jobService.finishPlanResume(
				options.parentAgentId,
				persistence.threadId,
				candidates.selection,
			);
	}
}

async function cancelJob(
	options: BackgroundJobsToolOptions,
	input: BackgroundJobsInput,
	ctx: ToolContext,
) {
	const parentThreadId = threadIdOf(ctx);
	if (!parentThreadId || !input.jobId) return { status: 'not-found' };

	return { status: await options.jobService.cancel(parentThreadId, input.jobId) };
}

function truncateResult(result: string): string {
	if (result.length <= RESULT_ECHO_MAX_CHARS) return result;
	return `${result.slice(0, RESULT_ECHO_MAX_CHARS)}\n[... truncated, ${result.length} characters total]`;
}
