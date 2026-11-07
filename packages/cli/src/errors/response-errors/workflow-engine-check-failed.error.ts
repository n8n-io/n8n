import type { EngineCheckReason } from '@n8n/api-types';
import { UnprocessableRequestError } from '@n8n/errors';

/** A publish that the engine check rejected. Nothing changed. */
export class WorkflowEngineCheckFailedError extends UnprocessableRequestError {
	constructor(details: { engineType: string; versionId: string; reasons: EngineCheckReason[] }) {
		const reasons = details.reasons
			.map(({ message, nodeName }) => (nodeName ? `${message} (node "${nodeName}")` : message))
			.join(' ');
		super(
			`This version can't be published on engine ${details.engineType}. ${reasons}`.trim(),
			undefined,
			{
				code: 'ENGINE_CHECK_FAILED',
				...details,
				// The editor keeps the published state for a validation error.
				validationError: true,
			},
		);
		this.name = 'WorkflowEngineCheckFailedError';
	}
}
