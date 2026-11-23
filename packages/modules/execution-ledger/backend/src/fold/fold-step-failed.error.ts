import { OperationalError } from '@n8n/errors';

/** A fold step threw on both of its runs, so the fold parked the batch for it. */
export class FoldStepFailedError extends OperationalError {
	constructor(
		readonly step: string,
		readonly firstLedgerId: string,
		cause: unknown,
	) {
		super(`Fold step "${step}" failed twice, the batch was parked`, {
			level: 'error',
			cause,
			tags: { foldStep: step },
			extra: { step, firstLedgerId },
		});
	}
}
