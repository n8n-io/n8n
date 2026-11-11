import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';

import { toRestorableMessages } from './restorable-messages';
import { ASSISTANT_AGENT_ID } from '../assistant-agent/assistant-turn-options';

/**
 * Seeds the Agents memory of an Assistant agent thread. The caller checks
 * thread access first.
 */
@Service()
export class AssistantEvalThreadMemoryService {
	constructor(private readonly systemAgentEval: SystemAgentEvalService) {}

	/**
	 * Create the memory row of the thread, as the first turn does before it
	 * saves its messages. The thread metadata needs this row. An existing row
	 * stays as it is.
	 */
	async ensureThread(user: User, threadId: string): Promise<void> {
		await this.systemAgentEval.ensureMemoryThread(ASSISTANT_AGENT_ID, user, threadId);
	}

	/**
	 * Write a seed message log into the thread, so the next turn loads it as
	 * history. Ids, roles, content and `createdAt` stay as in the seed. Call
	 * `ensureThread` first.
	 */
	async restoreThreadMessages(
		user: User,
		threadId: string,
		messages: Array<Record<string, unknown>>,
	): Promise<{ restored: number }> {
		const restorable = toRestorableMessages(messages);
		await this.systemAgentEval.saveMessages(ASSISTANT_AGENT_ID, user, threadId, restorable);
		return { restored: restorable.length };
	}
}
