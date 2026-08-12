import { WORKFLOW_DIFF_APP_URI } from '../constants';
import {
	registerMcpAppResource,
	type McpAppResourceServer,
	type RegisterMcpAppOptions,
} from './register-app-resource';

export type RegisterWorkflowDiffAppOptions = RegisterMcpAppOptions;

export function registerWorkflowDiffApp(
	server: McpAppResourceServer,
	options: RegisterWorkflowDiffAppOptions,
): void {
	registerMcpAppResource(
		server,
		{
			name: 'workflow-diff',
			uri: WORKFLOW_DIFF_APP_URI,
			htmlFile: 'workflow-diff.html',
			description: 'Before/after diff shown after updating a workflow',
		},
		options,
	);
}
