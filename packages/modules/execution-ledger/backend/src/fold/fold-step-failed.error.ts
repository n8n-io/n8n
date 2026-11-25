import { OperationalError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

/**
 * A fold step threw on both of its runs, so the fold parked the batch for it. The step error
 * is in `extra`, not `cause`: Sentry drops an event whose cause has the level `warning`.
 */
export class FoldStepFailedError extends OperationalError {
	readonly stepErrorMessage: string;

	constructor(
		readonly step: string,
		readonly firstLedgerId: string,
		stepError: unknown,
	) {
		const stepErrorMessage = getErrorMessage(stepError);
		super(`Fold step "${step}" failed twice, the batch was parked`, {
			level: 'error',
			tags: { foldStep: step },
			extra: {
				step,
				firstLedgerId,
				stepErrorName: stepError instanceof Error ? stepError.name : typeof stepError,
				stepErrorMessage,
			},
		});
		this.stepErrorMessage = stepErrorMessage;
	}
}
