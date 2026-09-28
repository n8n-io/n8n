import {
	WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME,
	type WorkflowToolIncompatibilityReason,
} from '@n8n/api-types';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export class BindingIncompatibleError extends BadRequestError {
	constructor(
		key: string,
		workflowName: string,
		incompatibility: WorkflowToolIncompatibilityReason,
	) {
		const detail =
			incompatibility.reason === 'incompatible_nodes'
				? `contains nodes an app cannot run: ${incompatibility.nodeTypes.join(', ')}`
				: `needs a '${WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME}' trigger`;
		super(`Binding '${key}': workflow "${workflowName}" ${detail}.`);
	}
}
