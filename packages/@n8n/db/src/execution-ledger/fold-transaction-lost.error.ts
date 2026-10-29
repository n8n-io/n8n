import { OperationalError } from 'n8n-workflow';

/**
 * `ROLLBACK TO SAVEPOINT` failed, so the fold transaction is gone. Any later statement would
 * run outside it, so the fold must stop. `cause` is the error of the failed step.
 */
export class FoldTransactionLostError extends OperationalError {
	constructor(savepoint: string, stepError: unknown, rollbackError: unknown) {
		super(`The fold transaction is lost: ROLLBACK TO SAVEPOINT ${savepoint} failed`, {
			level: 'error',
			cause: stepError,
			extra: {
				savepoint,
				rollbackError:
					rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
			},
		});
	}
}
