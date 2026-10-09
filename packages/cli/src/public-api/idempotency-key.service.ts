import { IdempotencyKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Rows per statement.
 * One statement stays short, so a backlog does not hold the writer lock.
 */
const CLEANUP_BATCH_SIZE = 500;

@Service()
export class IdempotencyKeyService {
	constructor(private readonly idempotencyKeyRepository: IdempotencyKeyRepository) {}

	/**
	 * Deletes keys created before `cutoff`.
	 * Returns how many rows went.
	 * `signal` stops the walk after the current batch, so shutdown or leader loss does not
	 * hold the caller for the rest of the backlog.
	 */
	async deleteOlderThan(cutoff: Date, signal: AbortSignal): Promise<number> {
		let total = 0;
		let deleted: number;

		do {
			deleted = await this.idempotencyKeyRepository.deleteOlderThan(cutoff, CLEANUP_BATCH_SIZE);
			total += deleted;
		} while (deleted >= CLEANUP_BATCH_SIZE && !signal.aborted);

		return total;
	}
}
