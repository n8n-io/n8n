import type { RunAgentPublicDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError, UnexpectedError, UnprocessableRequestError } from '@n8n/errors';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentChatExecutionService } from './agent-chat-execution.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentsService } from './agents.service';
import type { ProjectAgent } from './entities/agent.entity';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { threadBelongsTo } from './utils/agent-thread-access';

const PUBLIC_API_SOURCE = 'public_api';

const NOT_RUNNABLE = 'This agent is not ready to run.';
const NEEDS_APPROVAL = 'This agent uses a tool that needs approval. The Public API cannot run it.';

@Service()
export class AgentPublicRunService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentTestRunService: AgentTestRunService,
		private readonly credentialsService: CredentialsService,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly chatExecutionService: AgentChatExecutionService,
	) {}

	async run(user: User, agentId: string, body: RunAgentPublicDto) {
		const agent = await this.agentsService.findById(agentId);
		if (!agent) throw new NotFoundError('Not Found');
		if (draftRequiresApproval(agent)) throw new UnprocessableRequestError(NEEDS_APPROVAL);

		const result = await this.agentTestRunService.executeDraftRun({
			agentId,
			projectId: agent.projectId,
			message: body.message,
			sessionId: body.sessionId,
			credentialProvider: createAgentCredentialProvider(
				this.credentialsService,
				agent.projectId,
				user,
			),
			user,
			source: PUBLIC_API_SOURCE,
		});

		if (result.status === 'session_not_found') throw new NotFoundError('Not Found');
		if (result.status === 'agent_misconfigured') {
			throw new UnprocessableRequestError(`${NOT_RUNNABLE} Missing: ${result.missing.join(', ')}.`);
		}
		if (result.status === 'suspended') throw new UnprocessableRequestError(NEEDS_APPROVAL);

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

	async stop(user: User, agentId: string, executionId: string) {
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

		const cancelRequested = await this.chatExecutionService.requestCancel({
			projectId: thread.projectId,
			agentId,
			threadId: thread.id,
			executionId,
			userId: user.id,
			surface: 'preview',
		});
		return { executionId, status: cancelRequested ? 'cancel_requested' : execution.status };
	}
}

function draftRequiresApproval(agent: Pick<ProjectAgent, 'schema' | 'integrations'>): boolean {
	const tools = agent.schema?.tools ?? [];
	if (tools.some((tool) => tool.enabled !== false && tool.requireApproval)) return true;

	const servers = agent.schema?.mcpServers ?? [];
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

	return agent.integrations.some(
		(integration) => 'approval' in integration && integration.approval !== undefined,
	);
}
