import type { BuiltTool, ToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { SubAgentSource } from '@n8n/api-types';
import { z } from 'zod';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
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
			'Dispatch a configured sub-agent as a detached background job. Returns a receipt ' +
				'immediately; the sub-agent keeps working after your turn ends. Available sub-agents:\n' +
				roster,
		)
		.systemInstruction(
			'Prefer spawn_background_subagent for independent pieces of work that can run in parallel ' +
				'while you continue. After spawning, either continue with non-overlapping work or end ' +
				'your turn telling the user that work continues in the background. Retrieve outcomes ' +
				'later with check_background_jobs — the final answer is the contract; never expect the ' +
				'full trace. Instruct sub-agents producing large outputs to write them to the shared ' +
				'workspace and return a summary.',
		)
		.input(
			z.object({
				subAgentId: z.string().describe('Id of a configured sub-agent from the roster'),
				taskName: z.string().describe('Short label for the job, echoed in status checks'),
				goal: z.string().describe('What the sub-agent should accomplish'),
				context: z.string().optional().describe('Background information the sub-agent needs'),
				expectedOutput: z.string().optional().describe('Shape of the answer to return'),
				dedupeKey: z
					.string()
					.optional()
					.describe(
						'Single-flight key: a spawn with a key already held by a running job of this ' +
							'conversation returns that job instead of starting a second one',
					),
			}),
		)
		.output(
			z.object({
				status: z.enum(['started', 'limit-reached', 'duplicate', 'rejected']),
				jobId: z.string().optional(),
				existingJobId: z.string().optional(),
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

			const source = options.sourcesById[input.subAgentId];
			if (!source) {
				const ids = options.availableSubAgents.map((agent) => agent.id).join(', ');
				return {
					status: 'rejected',
					note: `No configured sub-agent matched "${input.subAgentId}". Available: ${ids}.`,
				};
			}

			const sandboxScope = decodeAgentSandboxHostMetadata(ctx.persistence?.hostMetadata);
			const receipt = await options.backgroundRunner.spawn(
				{
					subAgentId: input.subAgentId,
					source,
					taskName: input.taskName,
					goal: input.goal,
					context: input.context,
					expectedOutput: input.expectedOutput,
					dedupeKey: input.dedupeKey,
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
			if (receipt.status === 'duplicate') {
				return {
					status: 'duplicate',
					existingJobId: receipt.existingJobId,
					note: 'A running job of this conversation already holds this dedupeKey.',
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
				'their result or error. Pass an empty object {} to list all jobs (required — do not pass null).',
		)
		.input(
			z.object({
				jobIds: z.array(z.string()).optional().describe('Limit the check to these job ids'),
			}),
		)
		.handler(async (input, ctx) => {
			const parentThreadId = threadIdOf(ctx);
			if (!parentThreadId) {
				return { jobs: [], note: 'No persisted conversation thread is active.' };
			}

			const jobs = await jobService.listForThread(parentThreadId, input.jobIds);
			return {
				jobs: jobs.map((job) => ({
					jobId: job.id,
					kind: job.kind,
					title: job.title,
					status: job.status,
					...(job.result !== null ? { result: truncateResult(job.result) } : {}),
					...(job.error !== null ? { error: job.error } : {}),
					startedAt: job.createdAt.toISOString(),
					...(job.timeoutAt !== null ? { timeoutAt: job.timeoutAt.toISOString() } : {}),
				})),
				runningCount: jobs.filter((job) => job.status === 'running').length,
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
