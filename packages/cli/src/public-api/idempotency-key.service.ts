import { IdempotencyKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export const CLEANUP_BATCH_SIZE = 500;

@Service()
export class IdempotencyKeyService {
	constructor(private readonly idempotencyKeyRepository: IdempotencyKeyRepository) {}

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
