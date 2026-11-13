import { N8N_CHAT_INTEGRATION_TYPE, type AgentSseEvent } from '@n8n/api-types';
import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import {
	emitChunkEvents,
	type FlushableResponse,
	initSseStream,
	toChatErrorEvent,
} from './agent-sse-stream';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentRemoteTurnService } from './queue/agent-remote-turn.service';
import type { AgentChatResumeRequest } from './queue/agent-turn-request.types';
import type { AgentExecutionStreamChunk } from './types/agent-steering';
import { productionChatMemoryResourceId } from './utils/agent-memory-scope';

/** Where a resumed turn sends its events. */
export interface AgentResumeStream {
	send: (event: AgentSseEvent) => void;
	onChunk: (chunk: AgentExecutionStreamChunk) => void;
	onExecutionStarted: (executionId: string, sessionId: string, inputMessageIds: string[]) => void;
}

const toResumeStream = (send: (event: AgentSseEvent) => void): AgentResumeStream => ({
	send,
	onChunk: (chunk) => emitChunkEvents(chunk, send),
	onExecutionStarted: (executionId, sessionId, inputMessageIds) => {
		send({ type: 'execution-started', executionId, sessionId, inputMessageIds });
	},
});

/**
 * Runs the answer to a suspended tool call in the chat of an agent. In agent
 * queue mode an agent worker runs it, see `AgentRemoteTurnService`.
 */
@Service()
export class AgentChatResumeService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly testRuns: AgentTestRunService,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly remoteTurns: AgentRemoteTurnService,
	) {
		this.remoteTurns.handle('chat-resume', {
			mode: 'stream',
			run: async (request, { send }) => {
				const user = await this.userRepository.findByIdWithRole(request.userId);
				if (!user || user.disabled) throw new UserError('You can no longer execute this agent');
				await this.run(request, user, toResumeStream(send));
			},
			onError: (error, send) => send(toChatErrorEvent(error, 'Resume failed')),
		});
	}

	/** Stream a resume to the browser. A worker runs it when agent queue mode is on. */
	async relay(res: FlushableResponse, request: AgentChatResumeRequest, user: User): Promise<void> {
		const delivery = initSseStream(res);
		try {
			// A browser that leaves does not stop a local resume, so it does not stop a remote one.
			const ranRemotely = await this.remoteTurns.stream(request, delivery, { stopOnLeave: false });
			if (!ranRemotely)
				await this.run(request, user, {
					...toResumeStream(delivery.send),
					onChunk: delivery.onChunk,
				});
		} catch (error) {
			delivery.send(toChatErrorEvent(error, 'Resume failed'));
		} finally {
			delivery.close();
		}
	}

	/** Run the resumed turn in this process. */
	async run(request: AgentChatResumeRequest, user: User, stream: AgentResumeStream): Promise<void> {
		if (request.surface === 'preview') {
			const result = await this.testRuns.resumePreparedDraftRun({
				agentId: request.agentId,
				projectId: request.projectId,
				runId: request.runId,
				toolCallId: request.toolCallId,
				resumeData: request.resumeData,
				user,
				chatSurface: 'preview',
				errorMode: 'forward',
				onChunk: stream.onChunk,
				onBudgetNotice: (notice) => stream.send({ type: 'budget-notice', ...notice }),
				onExecutionStarted: stream.onExecutionStarted,
			});
			if (result.status === 'completed') {
				stream.send({
					type: 'done',
					...(result.executionId ? { executionId: result.executionId } : {}),
				});
			}
			return;
		}

		let executionId: string | undefined;
		const chunks = this.orchestrator.resumeForChat({
			agentId: request.agentId,
			projectId: request.projectId,
			runId: request.runId,
			toolCallId: request.toolCallId,
			resumeData: request.resumeData,
			user,
			usePublishedVersion: true,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			chatSurface: 'n8n-chat',
			expectedMemory: { resourceId: productionChatMemoryResourceId(user.id) },
			onExecutionStarted: stream.onExecutionStarted,
			onExecutionRecorded: (id) => {
				executionId = id;
			},
		});
		let suspended = false;
		let failed = false;
		for await (const chunk of chunks) {
			stream.onChunk(chunk);
			if (chunk.type === 'tool-call-suspended') suspended = true;
			if (chunk.type === 'error') failed = true;
		}
		if (!suspended && !failed) {
			stream.send({ type: 'done', ...(executionId ? { executionId } : {}) });
		}
	}
}
