import { OperationalError } from 'n8n-workflow';

import type { InstanceAiContext } from '../types';
import { createCredentialsTool } from './credentials.tool';
import { createWorkflowsTool } from './workflows.tool';
import { createWorkspaceTool } from './workspace.tool';

/** The lab uses the Assistant's read tools without its write capabilities. */
export function createPreferenceDiscoveryTools(context: InstanceAiContext) {
	if (
		!context.projectId ||
		!context.workflowService.nodeUsage ||
		!context.credentialService.usage
	) {
		throw new OperationalError('Preference discovery requires project-scoped usage tools.');
	}
	return [
		createWorkflowsTool(context, { allowedActions: ['list', 'node-usage', 'get'] }),
		createCredentialsTool(context, { allowedActions: ['list', 'usage'] }),
		createWorkspaceTool(context, { readOnly: true }),
	];
}
