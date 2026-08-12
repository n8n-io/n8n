import { WORKFLOW_PREVIEW_APP_URI } from '../constants';
import {
	registerMcpAppResource,
	type McpAppResourceServer,
	type RegisterMcpAppOptions,
} from './register-app-resource';

export type { McpAppResourceServer } from './register-app-resource';
export type RegisterWorkflowPreviewAppOptions = RegisterMcpAppOptions;

export function registerWorkflowPreviewApp(
	server: McpAppResourceServer,
	options: RegisterWorkflowPreviewAppOptions,
): void {
	registerMcpAppResource(
		server,
		{
			name: 'workflow-preview',
			uri: WORKFLOW_PREVIEW_APP_URI,
			htmlFile: 'workflow-preview.html',
			description: 'Workflow preview shown after creating a workflow from code',
		},
		options,
	);
}
