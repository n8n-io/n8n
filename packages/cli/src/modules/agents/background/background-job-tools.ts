import type { BuiltTool, ToolContext } from '@n8n/agents';
import { INLINE_SUB_AGENT_ID } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { SUB_AGENT_TASK_DIFFICULTIES, type SubAgentSource } from '@n8n/api-types';
import { z } from 'zod';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import { isTaskRunMemoryResourceId } from '../utils/agent-memory-scope';
import type { AgentBackgroundJobService } from './agent-background-job.service';
import type { SubAgentBackgroundRunner } from './sub-agent-background-runner';
import type { SubAgentRunContext } from '../sub-agents/sub-agent-runner';

/** Cap on the result text echoed to the model; the full text stays on the row. */
const RESULT_ECHO_MAX_CHARS = 8000;

export interface BackgroundJobToolsOptions {
	jobService: AgentBackgroundJobService;
	backgroundRunner: SubAgentBackgroundRunner;
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents: Array<{ id: string; name: string; useWhen?: string }>;
	projectId: string;
	parentAgentId: string;
	// The workspace handle is principal-scoped, not thread-scoped. The sandbox
	// outlives the parent turn, so capture it when the tool is built.
	runContext: Pick<
		SubAgentRunContext,
		| 'credentialProvider'
		| 'runType'
		| 'workflowToolExecutionMode'
		| 'user'
		| 'instrumentation'
		| 'parentWorkspaceHandle'
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
				'sub-agent keeps working after your turn ends. Use delegate_subagent in the foreground by ' +
				'default. Use background mode for clear parallel work, a clearly long task, or an ' +
				'explicit user request for background mode. Pass "inline" as subAgentId to spawn a ' +
				'copy of yourself for a self-contained subtask.' +
				(roster ? ` Available configured sub-agents:\n${roster}` : ''),
		)
		.systemInstruction(
			'When delegation is appropriate, use delegate_subagent in the foreground by default. ' +
				'Use spawn_background_subagent when independent work benefits from parallel execution, ' +
				'when the task will clearly take substantial time, or when the user explicitly requests ' +
				'background mode. If any of these conditions applies, choose spawn_background_subagent ' +
				'instead of delegate_subagent. For example, run independent research workstreams as ' +
				'separate background jobs, even when you need all their results for the final synthesis. ' +
				'Broad research across many sources or several slow steps can indicate ' +
				'a long task. A clearly long task can run in the background even if you have no other ' +
				'work. If the duration is uncertain and no other background condition applies, use ' +
				'foreground mode. Keep work that needs user input with the parent; background agents ' +
				'cannot pause for user interaction. Pass all context the child needs. After a successful ' +
				'launch, continue independent work that does not overlap with the child, or end your turn ' +
				'with a short message that work continues in the background. Completion triggers a ' +
				'follow-up. A launch receipt does not mean the task is complete. Do not check jobs just ' +
				'to wait for them, and do not sleep or poll for completion. The final answer is the ' +
				'contract; never expect the full trace. Instruct ' +
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
					parentSandboxPrincipalHash: sandboxScope.principalHash,
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
					note: 'Job dispatched. Continue independent work or end this turn with a short progress message. Completion triggers a follow-up. Do not wait, sleep, or poll for completion.',
				};
			}
			return {
				status: 'limit-reached',
				note: 'This conversation already has the maximum number of running background jobs. Wait for one to finish or cancel one.',
			};
		})
		.build();
}

export function createCheckBackgroundJobsTool(jobService: AgentBackgroundJobService): BuiltTool {
	return new Tool('check_background_jobs')
		.description(
			'List the background jobs of this conversation with their status and, once settled, ' +
				'their result or error. Pass an empty object {} to list all jobs (required — do not pass null). ' +
				'Call this at most once per turn. Collect all relevant jobs in that call, rather than ' +
				'checking each job separately.',
		)
		.systemInstruction(
			'Call check_background_jobs at most once per turn, including calls made together. ' +
				'Omit jobIds to check all jobs, or include all relevant job IDs in one call. Use the ' +
				'results already available and continue independent work. If further progress depends ' +
				'on running jobs, end your turn with a short progress message. Completion triggers a ' +
				'follow-up. Do not wait, sleep, or call this tool again in the same turn to see whether ' +
				'a job has finished. A user status request or a completion hint can justify one check ' +
				'in a later turn. Do not claim that running jobs are complete.',
		)
		.input(
			z.object({
				jobIds: z.array(z.string()).max(50).optional().describe('Limit the check to these job ids'),
			}),
		)
		.handler(async (input, ctx) => {
			const parentThreadId = threadIdOf(ctx);
			if (!parentThreadId) {
				return { jobs: [], note: 'No persisted conversation thread is active.' };
			}

			const jobs = await jobService.listForThread(parentThreadId, input.jobIds);
			await jobService.markMailConsumed(
				parentThreadId,
				jobs.filter((job) => job.status !== 'running').map((job) => job.id),
			);
			return {
				jobs: jobs.map((job) => ({
					jobId: job.id,
					kind: job.kind,
					title: job.title,
					status: job.status,
					...(job.result !== null ? { result: truncateResult(job.result) } : {}),
					...(job.error !== null ? { error: truncateResult(job.error) } : {}),
					startedAt: job.createdAt.toISOString(),
					...(job.timeoutAt !== null ? { timeoutAt: job.timeoutAt.toISOString() } : {}),
					...(job.childExecutionId !== null ? { executionId: job.childExecutionId } : {}),
				})),
				runningCount: jobs.filter((job) => job.status === 'running').length,
				note: 'You have checked background jobs for this turn. Use the available results and continue independent work. If further progress depends on running jobs, end this turn with a short progress message. Completion triggers a follow-up. Do not wait, sleep, or check again in this turn.',
			};
		})
		.build();
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
