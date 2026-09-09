import { ConflictError } from '@/errors/response-errors/conflict.error';

import { PromotionConflictError } from './database/promotion-conflict.error';

/** Runs a write and reports a database conflict as a 409. */
export async function mapPromotionConflicts<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (error instanceof PromotionConflictError) throw new ConflictError(error.message);
		throw error;
	}
}
