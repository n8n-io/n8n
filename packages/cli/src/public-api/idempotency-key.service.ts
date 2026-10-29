import { IDEMPOTENCY_KEY_TTL_MS, IdempotencyKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { IdempotencyClaim, IdempotencyStore } from '@/idempotency/idempotency.types';

export const CLEANUP_BATCH_SIZE = 500;

const CLAIM_ATTEMPTS = 3;

@Service()
export class IdempotencyKeyService implements IdempotencyStore {
	constructor(private readonly idempotencyKeyRepository: IdempotencyKeyRepository) {}

	async claim(input: {
		userId: string;
		idempotencyKey: string;
		fingerprint: string;
	}): Promise<IdempotencyClaim> {
		const cutoff = new Date(Date.now() - IDEMPOTENCY_KEY_TTL_MS);

		for (let attempt = 0; attempt < CLAIM_ATTEMPTS; attempt++) {
			const insertedId = await this.idempotencyKeyRepository.insertProcessing(input);
			if (insertedId) return { outcome: 'claimed', id: insertedId };

			const existing = await this.idempotencyKeyRepository.findByUserIdAndKey(
				input.userId,
				input.idempotencyKey,
			);
			if (!existing) continue;

			if (createdAtMs(existing.createdAt) < cutoff.getTime()) {
				await this.idempotencyKeyRepository.deleteByUserIdAndKeyOlderThan(
					input.userId,
					input.idempotencyKey,
					cutoff,
				);
				continue;
			}

			if (existing.fingerprint !== input.fingerprint) return { outcome: 'mismatch' };
			if (existing.status === 'processing' || existing.responseStatus === null) {
				return { outcome: 'processing' };
			}

			return {
				outcome: 'replay',
				responseStatus: existing.responseStatus,
				responseBody: existing.responseBody,
			};
		}

		throw new UnexpectedError('Failed to claim an idempotency key');
	}

	async complete(id: string, responseStatus: number, responseBody: unknown): Promise<void> {
		await this.idempotencyKeyRepository.markCompleted(id, responseStatus, responseBody);
	}

	async release(id: string): Promise<void> {
		await this.idempotencyKeyRepository.deleteProcessingById(id);
	}

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

function createdAtMs(value: Date | string): number {
	const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
	if (Number.isNaN(time)) {
		throw new UnexpectedError('Idempotency key createdAt is not a valid time');
	}
	return time;
}
