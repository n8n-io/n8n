import type {
	AgentExecutionPublicItemDto,
	AgentExecutionStatus,
	RunAgentPublicDto,
	StoppedAgentExecutionPublicDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError, UnexpectedError, UnprocessableRequestError } from '@n8n/errors';

import { AgentExecutionService } from './agent-execution.service';
import { AgentSessionStopService } from './agent-session-stop.service';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentsService } from './agents.service';
import type { AgentExecution } from './entities/agent-execution.entity';
import type { ProjectAgent } from './entities/agent.entity';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { publicApiMemoryResourceId } from './utils/agent-memory-scope';
import { threadBelongsTo } from './utils/agent-thread-access';

const NOT_PUBLISHED = 'This agent has no published version. The Public API cannot run it.';
const NEEDS_APPROVAL = 'This agent uses a tool that needs approval. The Public API cannot run it.';

@Service()
export class AgentPublicRunService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentTestRunService: AgentTestRunService,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly sessionStopService: AgentSessionStopService,
	) {}

	async run(user: User, agentId: string, body: RunAgentPublicDto, abortSignal?: AbortSignal) {
		const agent = await this.agentsService.findById(agentId);
		if (!agent) throw new NotFoundError('Not Found');

		// The run uses the published version, so both checks read it, not the draft.
		if (!agent.activeVersionId) throw new UnprocessableRequestError(NOT_PUBLISHED);
		if (
			runRequiresApproval({
				schema: agent.activeVersion?.schema ?? null,
				integrations: agent.integrations,
			})
		) {
			throw new UnprocessableRequestError(NEEDS_APPROVAL);
		}

		const result = await this.agentTestRunService.executePublishedRun({
			agentId,
			projectId: agent.projectId,
			message: body.message,
			sessionId: body.sessionId,
			user,
			...(abortSignal ? { abortSignal } : {}),
		});

		if (result.status === 'session_not_found') throw new NotFoundError('Not Found');
		if (result.status === 'suspended') {
			const cancelled = await this.agentTestRunService.cancelSuspendedRuns({
				agentId,
				suspensions: result.suspensions,
				userId: user.id,
				resourceId: publicApiMemoryResourceId(user.id),
			});
			throw new UnprocessableRequestError(
				cancelled
					? NEEDS_APPROVAL
					: `${NEEDS_APPROVAL} The run could not be cancelled. Stop execution ${result.executionId}.`,
			);
		}

		const execution = await this.executionRepository.findExecution(result.executionId);
		if (!execution) throw new UnexpectedError('The agent run did not record an execution.');

		return {
			response: result.response,
			sessionId: result.sessionId,
			executionId: result.executionId,
			status: execution.status,
			usage: {
				promptTokens: execution.promptTokens,
				completionTokens: execution.completionTokens,
				totalTokens: execution.totalTokens,
				cost: execution.cost,
			},
			...(execution.error ? { error: execution.error } : {}),
		};
	}

	async stop(
		user: User,
		agentId: string,
		executionId: string,
	): Promise<StoppedAgentExecutionPublicDto> {
		const execution = await this.executionRepository.findExecution(executionId);
		if (!execution) throw new NotFoundError('Not Found');

		const thread = await this.executionService.findThreadById(execution.threadId);
		if (
			!thread ||
			thread.agentId !== agentId ||
			!threadBelongsTo(thread, thread.projectId, agentId, user.id)
		) {
			throw new NotFoundError('Not Found');
		}

		if (execution.status !== 'running') return { executionId, status: execution.status };

		// Public API runs are not registered as chat executions, so the chat
		// cancel path cannot abort them. Abort the execution controller instead.
		const aborted = await this.sessionStopService.abortExecution(agentId, thread.id, executionId);
		if (aborted) return { executionId, status: 'cancel_requested' };

		const latest = await this.executionRepository.findExecution(executionId);
		if (!latest) throw new NotFoundError('Not Found');
		return { executionId, status: latest.status };
	}

	/**
	 * The top-level runs of one agent that the user can see, newest first. A
	 * project session is visible to every project member, a user session only
	 * to its owner — the same rule as the session list in the editor. The
	 * `@ProjectScope` on the route has already authorized the caller for the
	 * agent's project.
	 */
	async listExecutions(
		user: User,
		agentId: string,
		options: {
			sessionId?: string;
			status?: AgentExecutionStatus;
			offset: number;
			limit: number;
		},
	): Promise<{ count: number; data: AgentExecutionPublicItemDto[] }> {
		const agent = await this.agentsService.findById(agentId);
		if (!agent) throw new NotFoundError('Not Found');

		const [rows, count] = await this.executionRepository.findListForAgent(
			agentId,
			user.id,
			{ sessionId: options.sessionId, status: options.status },
			{ offset: options.offset, limit: options.limit },
		);

		return { count, data: rows.map(toAgentExecutionPublicItem) };
	}
}

function toAgentExecutionPublicItem(row: AgentExecution): AgentExecutionPublicItemDto {
	return {
		executionId: row.id,
		sessionId: row.threadId,
		status: row.status,
		source: row.source,
		createdAt: toIsoTimestamp(row.createdAt),
		startedAt: row.startedAt ? toIsoTimestamp(row.startedAt) : null,
		stoppedAt: row.stoppedAt ? toIsoTimestamp(row.stoppedAt) : null,
		usage: {
			promptTokens: row.promptTokens,
			completionTokens: row.completionTokens,
			totalTokens: row.totalTokens,
			cost: row.cost,
		},
	};
}

function toIsoTimestamp(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

/** Whether the configuration a run would use contains anything that can pause for approval. */
function runRequiresApproval(config: Pick<ProjectAgent, 'schema' | 'integrations'>): boolean {
	const tools = config.schema?.tools ?? [];
	if (tools.some((tool) => tool.enabled !== false && tool.requireApproval)) return true;

	const servers = config.schema?.mcpServers ?? [];
	if (
		servers.some((server) => {
			const permissions = server.toolPermissions;
			if (!permissions) return false;
			return (
				permissions.categories.read === 'require_approval' ||
				permissions.categories.write === 'require_approval' ||
				Object.values(permissions.tools ?? {}).includes('require_approval')
			);
		})
	) {
		return true;
	}

	return config.integrations.some(
		(integration) => 'approval' in integration && integration.approval !== undefined,
	);
}
