import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';
import { INLINE_SUB_AGENT_ID } from '@n8n/agents';
import {
	APPROVAL_RESUME_SCHEMA,
	APPROVAL_SUSPEND_SCHEMA,
	Tool,
	type ApprovalResumePayload,
	type ApprovalSuspendPayload,
} from '@n8n/agents/tool';
import { SUB_AGENT_TASK_DIFFICULTIES, type SubAgentSource } from '@n8n/api-types';
import { z } from 'zod';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import type { AgentBackgroundJobService } from './agent-background-job.service';
import type { SubAgentBackgroundRunner } from './sub-agent-background-runner';
import type { SubAgentRunContext } from '../sub-agents/sub-agent-runner';

/** Cap on the result text echoed to the model; the full text stays on the row. */
const RESULT_ECHO_MAX_CHARS = 8000;

/** Private checkpoint state of a check_background_jobs call parked on a child's approval. */
const CHECK_CONTINUATION_SCHEMA = z.object({ jobId: z.string() });

export interface BackgroundJobToolsOptions {
	jobService: AgentBackgroundJobService;
	backgroundRunner: SubAgentBackgroundRunner;
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents: Array<{ id: string; name: string; useWhen?: string }>;
	projectId: string;
	parentAgentId: string;
	runContext: Pick<
		SubAgentRunContext,
		'credentialProvider' | 'runType' | 'workflowToolExecutionMode' | 'user' | 'instrumentation'
	>;
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

export function createSpawnBackgroundSubAgentTool(options: BackgroundJobToolsOptions): BuiltTool {
	const roster = options.availableSubAgents
		.map((agent) => `- ${agent.id}: ${agent.name}${agent.useWhen ? ` — ${agent.useWhen}` : ''}`)
		.join('\n');

	return new Tool('spawn_background_subagent')
		.description(
			'Dispatch a sub-agent as a detached background job. Returns a receipt immediately; the ' +
				'sub-agent keeps working after your turn ends. Pass "inline" as subAgentId to spawn a ' +
				'copy of yourself for a self-contained subtask.' +
				(roster ? ` Available configured sub-agents:\n${roster}` : ''),
		)
		.systemInstruction(
			'Prefer spawn_background_subagent for independent pieces of work that can run in parallel ' +
				'while you continue. After spawning, either continue with non-overlapping work or end ' +
				'your turn telling the user that work continues in the background — never poll ' +
				'check_background_jobs in a loop waiting for jobs to finish; check once in a later turn ' +
				'instead. The final answer is the contract; never expect the full trace. Instruct ' +
				'sub-agents producing large outputs to write them to the shared workspace and return a ' +
				'summary.',
		)
		.input(
			z.object({
				subAgentId: z
					.string()
					.describe(
						'Id of a configured sub-agent from the roster, or "inline" for a copy of yourself',
					),
				// min/max mirror the varchar(255) title column — an oversized value
				// would otherwise surface as a raw DB error.
				taskName: z
					.string()
					.min(1)
					.max(255)
					.describe('Short label for the job, echoed in status checks'),
				goal: z.string().describe('What the sub-agent should accomplish'),
				context: z.string().optional().describe('Background information the sub-agent needs'),
				expectedOutput: z.string().optional().describe('Shape of the answer to return'),
				difficulty: z
					.enum(SUB_AGENT_TASK_DIFFICULTIES)
					.optional()
					.describe('Inline spawns only: picks the model tier configured for this difficulty'),
			}),
		)
		.output(
			z.object({
				status: z.enum(['started', 'limit-reached', 'rejected']),
				jobId: z.string().optional(),
				note: z.string().optional(),
			}),
		)
		.handler(async (input, ctx) => {
			const parentThreadId = threadIdOf(ctx);
			const parentResourceId = ctx.persistence?.resourceId;
			if (!parentThreadId || !parentResourceId) {
				return {
					status: 'rejected',
					note: 'Background jobs need a persisted conversation thread; none is active.',
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
			const receipt = await options.backgroundRunner.spawn(
				{
					subAgentId: source.agentId,
					source,
					taskName: input.taskName,
					goal: input.goal,
					context: input.context,
					expectedOutput: input.expectedOutput,
					...(isSelfDelegation && input.difficulty !== undefined
						? { difficulty: input.difficulty }
						: {}),
					parentThreadId,
					parentResourceId,
					...(sandboxScope?.projectId === options.projectId
						? { parentSandboxPrincipalHash: sandboxScope.principalHash }
						: {}),
				},
				{
					projectId: options.projectId,
					parentAgentId: options.parentAgentId,
					...options.runContext,
				},
			);

			if (receipt.status === 'started') {
				return {
					status: 'started',
					jobId: receipt.jobId,
					note: 'Job dispatched. Check on it later with check_background_jobs.',
				};
			}
			return {
				status: 'limit-reached',
				note: 'This conversation already has the maximum number of running background jobs. Wait for one to finish or cancel one.',
			};
		})
		.build();
}

type CheckBackgroundJobsOptions = Pick<
	BackgroundJobToolsOptions,
	'jobService' | 'backgroundRunner' | 'projectId' | 'runContext'
>;

/**
 * Besides listing, this tool is how a parked child's approval reaches the
 * human: the call suspends with the child's own approval payload, so the
 * existing card rendering and resume paths of the parent's surface apply, and
 * on resume it hands the decision to the child.
 */
export function createCheckBackgroundJobsTool(options: CheckBackgroundJobsOptions): BuiltTool {
	return new Tool('check_background_jobs')
		.description(
			'List the background jobs of this conversation with their status and, once settled, ' +
				'their result or error. Pass an empty object {} to list all jobs (required — do not pass null). ' +
				'When a job waits for a human decision, this call pauses and shows the approval card to ' +
				'the user; it returns after they answered and the decision was forwarded to the job. ' +
				'Call this at most once per turn: when jobs are still running, tell the user and end your ' +
				'turn — repeated checks within one turn only burn time and tokens.',
		)
		.input(
			z.object({
				jobIds: z.array(z.string()).max(50).optional().describe('Limit the check to these job ids'),
			}),
		)
		.suspend(APPROVAL_SUSPEND_SCHEMA)
		.resume(APPROVAL_RESUME_SCHEMA)
		.handler(
			async (
				input,
				ctx: InterruptibleToolContext<ApprovalSuspendPayload, ApprovalResumePayload>,
			) => {
				const parentThreadId = threadIdOf(ctx);
				if (!parentThreadId) {
					return { jobs: [], note: 'No persisted conversation thread is active.' };
				}

				const answered = CHECK_CONTINUATION_SCHEMA.safeParse(ctx.continuation);
				const note =
					answered.success && ctx.resumeData !== undefined
						? await forwardDecision(options, parentThreadId, answered.data.jobId, ctx.resumeData)
						: undefined;

				const jobs = await options.jobService.listForThread(parentThreadId, input.jobIds);

				// One card per call: after an answer the listing goes back to the model.
				const parked = answered.success
					? undefined
					: jobs.find((job) => job.suspendPayload !== null);
				if (parked?.suspendPayload) {
					const label = parked.suspendPayload.displayName ?? parked.suspendPayload.toolName;
					return await ctx.suspend(
						{ ...parked.suspendPayload, displayName: `${parked.title}: ${label}` },
						{ continuation: { jobId: parked.id } },
					);
				}

				return {
					jobs: jobs.map((job) => ({
						jobId: job.id,
						kind: job.kind,
						title: job.title,
						status: job.status,
						...(job.suspendPayload !== null ? { awaitingHumanInput: true } : {}),
						...(job.result !== null ? { result: truncateResult(job.result) } : {}),
						...(job.error !== null ? { error: truncateResult(job.error) } : {}),
						startedAt: job.createdAt.toISOString(),
						...(job.timeoutAt !== null ? { timeoutAt: job.timeoutAt.toISOString() } : {}),
					})),
					runningCount: jobs.filter((job) => job.status === 'running').length,
					...(note ? { note } : {}),
				};
			},
		)
		.build();
}

async function forwardDecision(
	{ jobService, backgroundRunner, projectId, runContext }: CheckBackgroundJobsOptions,
	parentThreadId: string,
	jobId: string,
	resumeData: ApprovalResumePayload,
): Promise<string> {
	const job = await jobService.findJob(jobId);
	if (
		!job?.suspension ||
		job.parentThreadId !== parentThreadId ||
		!(await jobService.claimSuspendedForResume(job.id))
	) {
		return `Job ${jobId} no longer waits for a decision; nothing was forwarded.`;
	}

	backgroundRunner.resume(job, job.suspension, resumeData, { projectId, ...runContext });
	const decision = resumeData.approved ? 'approved' : 'declined';
	return `The user's decision (${decision}) was forwarded to job "${job.title}"; it continues in the background.`;
}

export function createCancelBackgroundJobTool(jobService: AgentBackgroundJobService): BuiltTool {
	return new Tool('cancel_background_job')
		.description('Cancel a running background job of this conversation by its job id.')
		.input(z.object({ jobId: z.string() }))
		.output(z.object({ status: z.enum(['cancelled', 'not-found', 'already-settled']) }))
		.handler(async (input, ctx) => {
			const parentThreadId = threadIdOf(ctx);
			if (!parentThreadId) return { status: 'not-found' };

			return { status: await jobService.cancel(parentThreadId, input.jobId) };
		})
		.build();
}

function truncateResult(result: string): string {
	if (result.length <= RESULT_ECHO_MAX_CHARS) return result;
	return `${result.slice(0, RESULT_ECHO_MAX_CHARS)}\n[... truncated, ${result.length} characters total]`;
}
