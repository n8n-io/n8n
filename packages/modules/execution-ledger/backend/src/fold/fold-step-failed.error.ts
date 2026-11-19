import { OperationalError } from '@n8n/errors';

/** A fold step threw. The fold rolled the batch back, or parked it for the step. `cause` is the step error. */
export class FoldStepFailedError extends OperationalError {
	constructor(
		readonly step: string,
		readonly attempt: number,
		readonly firstLedgerId: string,
		cause: unknown,
	) {
		super(`Fold step "${step}" failed`, {
			level: 'error',
			cause,
			tags: { foldStep: step },
			extra: { step, attempt, firstLedgerId },
		});
	}
}
