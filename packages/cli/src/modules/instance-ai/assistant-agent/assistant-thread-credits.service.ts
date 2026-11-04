import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import type { AgentThreadCreditTotals } from '../instance-ai-credit.service';
import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/** Thread metadata key with the credit total of an Assistant agent thread. */
export const ASSISTANT_CREDITS_METADATA_KEY = 'assistantCreditsUsed';

function asTotal(value: unknown): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

/**
 * Keeps the credit total of Assistant agent threads in the thread metadata of
 * the Agents memory. The total is for display only: the billing service keeps
 * the real count.
 */
@Service()
export class AssistantThreadCreditsService implements AgentThreadCreditTotals {
	constructor(private readonly threadMetadata: SystemAgentThreadMetadataService) {}

	/** The credit total of a thread that the user can use, or `undefined` before the first claim. */
	async getTotal(user: User, threadId: string): Promise<number | undefined> {
		return asTotal(
			await this.threadMetadata.read(
				ASSISTANT_AGENT_ID,
				user,
				threadId,
				ASSISTANT_CREDITS_METADATA_KEY,
			),
		);
	}

	/**
	 * Add the credits of one claim to the thread total, on the locked thread row.
	 * Returns the new total, or `undefined` when the user cannot use an Assistant
	 * agent thread with this id, or the thread has no memory row yet.
	 */
	async addCredits(user: User, threadId: string, delta: number): Promise<number | undefined> {
		// The change runs on the locked row, so it computes the new total. It does
		// not run when the thread has no memory row.
		let total: number | undefined;
		try {
			await this.threadMetadata.update(
				ASSISTANT_AGENT_ID,
				user,
				threadId,
				ASSISTANT_CREDITS_METADATA_KEY,
				(current) => (total = (asTotal(current) ?? 0) + delta),
			);
			return total;
		} catch (error) {
			if (error instanceof NotFoundError) return undefined;
			throw error;
		}
	}
}
