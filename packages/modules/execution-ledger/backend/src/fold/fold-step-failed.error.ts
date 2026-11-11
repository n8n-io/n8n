import { OperationalError } from 'n8n-workflow';

/** A fold step threw, so the fold rolled the batch back. `cause` is the step error. */
export class FoldStepFailedError extends OperationalError {
	constructor(
		readonly step: string,
		readonly attempt: number,
		cause: unknown,
	) {
		super(`Fold step "${step}" failed, the batch stays in the ledger`, {
			level: 'error',
			cause,
			extra: { step, attempt },
		});
	}
}
