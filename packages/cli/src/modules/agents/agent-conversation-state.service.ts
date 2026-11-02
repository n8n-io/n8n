import type { SerializableAgentState } from '@n8n/agents';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

@Service()
export class AgentConversationStateService {
	constructor(
		private readonly executionRepository: AgentExecutionRepository,
		private readonly checkpointStorage: N8NCheckpointStorage,
	) {}

	/** Read the current records. The resume claim still controls which attempt can proceed. */
	async inspect(
		agentId: string,
		threadId: string,
		ctx: OperationContext = {},
	): Promise<{ running: boolean; suspendedCheckpoint: SerializableAgentState | null }> {
		const [running, suspendedCheckpoint] = await Promise.all([
			this.executionRepository.existsRunningByThread(threadId, ctx),
			this.checkpointStorage.findSuspendedForThread(agentId, threadId, ctx),
		]);
		return { running, suspendedCheckpoint };
	}

	/**
	 * A click on a card whose run expired or was already resolved must not resume
	 * it. The inner state matters too: `active` only says the row is present and
	 * within its TTL, while the runtime rejects anything it has already claimed.
	 */
	async isResumable(agentId: string, runId: string): Promise<boolean> {
		const result = await this.checkpointStorage.getStatus(runId, agentId);
		return result.status === 'active' && result.checkpoint.status === 'suspended';
	}

	/**
	 * The agent thread of a suspended run and the tool results that the run
	 * got before it was suspended. A resume uses them to send the files that
	 * the run queued for its final reply.
	 */
	async getSuspendedRun(
		agentId: string,
		runId: string,
	): Promise<{
		threadId: string;
		toolResults: Array<{ toolCallId: string; toolName: string; output: unknown }>;
	} | null> {
		const result = await this.checkpointStorage.getStatus(runId, agentId);
		// A run that is already claimed or done has no queue for a resume to send.
		if (result.status !== 'active' || result.checkpoint.status !== 'suspended') return null;
		const { persistence, messageList } = result.checkpoint;
		if (!persistence) return null;
		const responseIds = new Set(messageList.responseIds);
		const toolResults = messageList.messages
			.filter((message) => responseIds.has(message.id))
			.flatMap((message) => ('content' in message ? message.content : []))
			.flatMap((block) =>
				block.type === 'tool-call' && block.state === 'resolved'
					? [{ toolCallId: block.toolCallId, toolName: block.toolName, output: block.output }]
					: [],
			);
		return { threadId: persistence.threadId, toolResults };
	}
}
