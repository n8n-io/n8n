import type { InstanceAiContext } from '../types';

import { createListWorkflowsTool } from './workflows/list-workflows.tool';
import { createGetWorkflowTool } from './workflows/get-workflow.tool';
import { createCreateWorkflowTool } from './workflows/create-workflow.tool';
import { createUpdateWorkflowTool } from './workflows/update-workflow.tool';
import { createDeleteWorkflowTool } from './workflows/delete-workflow.tool';
import { createActivateWorkflowTool } from './workflows/activate-workflow.tool';

import { createListExecutionsTool } from './executions/list-executions.tool';
import { createRunWorkflowTool } from './executions/run-workflow.tool';
import { createGetExecutionTool } from './executions/get-execution.tool';
import { createDebugExecutionTool } from './executions/debug-execution.tool';

import { createListCredentialsTool } from './credentials/list-credentials.tool';
import { createGetCredentialTool } from './credentials/get-credential.tool';
import { createCreateCredentialTool } from './credentials/create-credential.tool';
import { createDeleteCredentialTool } from './credentials/delete-credential.tool';
import { createGetCredentialTool } from './credentials/get-credential.tool';
import { createListCredentialsTool } from './credentials/list-credentials.tool';
import { createTestCredentialTool } from './credentials/test-credential.tool';
import { createUpdateCredentialTool } from './credentials/update-credential.tool';
import { createDebugExecutionTool } from './executions/debug-execution.tool';
import { createGetExecutionTool } from './executions/get-execution.tool';
import { createRunWorkflowTool } from './executions/run-workflow.tool';
import { createGetNodeDescriptionTool } from './nodes/get-node-description.tool';
import { createListNodesTool } from './nodes/list-nodes.tool';
import { createActivateWorkflowTool } from './workflows/activate-workflow.tool';
import { createCreateWorkflowTool } from './workflows/create-workflow.tool';
import { createDeleteWorkflowTool } from './workflows/delete-workflow.tool';
import { createGetWorkflowTool } from './workflows/get-workflow.tool';
import { createListWorkflowsTool } from './workflows/list-workflows.tool';
import { createUpdateWorkflowTool } from './workflows/update-workflow.tool';

/**
 * Creates all native n8n tools for the instance agent.
 * Each tool captures the InstanceAiContext via closure for service access.
 */
export function createAllTools(context: InstanceAiContext) {
	return {
		'list-workflows': createListWorkflowsTool(context),
		'get-workflow': createGetWorkflowTool(context),
		'create-workflow': createCreateWorkflowTool(context),
		'update-workflow': createUpdateWorkflowTool(context),
		'delete-workflow': createDeleteWorkflowTool(context),
		'activate-workflow': createActivateWorkflowTool(context),
		'list-executions': createListExecutionsTool(context),
		'run-workflow': createRunWorkflowTool(context),
		'get-execution': createGetExecutionTool(context),
		'debug-execution': createDebugExecutionTool(context),
		'list-credentials': createListCredentialsTool(context),
		'get-credential': createGetCredentialTool(context),
		'create-credential': createCreateCredentialTool(context),
		'update-credential': createUpdateCredentialTool(context),
		'delete-credential': createDeleteCredentialTool(context),
		'test-credential': createTestCredentialTool(context),
		'list-nodes': createListNodesTool(context),
		'get-node-description': createGetNodeDescriptionTool(context),
	};
}
