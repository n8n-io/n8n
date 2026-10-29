import { OperationalError } from 'n8n-workflow';

/**
 * A statement that restores the transaction after a failed step failed, so the fold
 * transaction is gone or aborted and the fold must stop. `cause` is the error of the step.
 */
export class FoldTransactionLostError extends OperationalError {
	constructor(statement: string, stepError: unknown, statementError: unknown) {
		super(`The fold transaction is lost: ${statement} failed`, {
			level: 'error',
			cause: stepError,
			extra: {
				statement,
				statementError:
					statementError instanceof Error ? statementError.message : String(statementError),
			},
		});
	}
}
