import { EntityNotFoundError } from '@n8n/typeorm';

/**
 * Whether `error` is a TypeORM "entity not found" error, e.g. from `findOneOrFail`.
 */
export function isEntityNotFoundError(error: unknown): boolean {
	return error instanceof EntityNotFoundError;
}
