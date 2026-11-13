import { OperationalError } from '@n8n/errors';

/** A try-lock found the lock held by another caller or process. */
export class DbLockUnavailableError extends OperationalError {
	constructor(lockKey: string) {
		super(`DbLock ${lockKey} is already held by another process`);
	}
}
