import type { InstanceAiContext, OrchestrationContext } from '../types';
import { createGetBestPracticesTool } from './best-practices/get-best-practices.tool';
import { createDeleteCredentialTool } from './credentials/delete-credential.tool';
import { createGetCredentialTool } from './credentials/get-credential.tool';
import { createListCredentialsTool } from './credentials/list-credentials.tool';
import { createSetupCredentialsTool } from './credentials/setup-credentials.tool';
import { createTestCredentialTool } from './credentials/test-credential.tool';
import { createAddDataTableColumnTool } from './data-tables/add-data-table-column.tool';
import { createCreateDataTableTool } from './data-tables/create-data-table.tool';
import { createDeleteDataTableColumnTool } from './data-tables/delete-data-table-column.tool';
import { createDeleteDataTableRowsTool } from './data-tables/delete-data-table-rows.tool';
import { createDeleteDataTableTool } from './data-tables/delete-data-table.tool';
import { createGetDataTableSchemaTool } from './data-tables/get-data-table-schema.tool';
import { createInsertDataTableRowsTool } from './data-tables/insert-data-table-rows.tool';
import { createListDataTablesTool } from './data-tables/list-data-tables.tool';
import { createQueryDataTableRowsTool } from './data-tables/query-data-table-rows.tool';
import { createRenameDataTableColumnTool } from './data-tables/rename-data-table-column.tool';
import { createUpdateDataTableRowsTool } from './data-tables/update-data-table-rows.tool';
import { createDebugExecutionTool } from './executions/debug-execution.tool';
import { createGetExecutionTool } from './executions/get-execution.tool';
import { createGetNodeOutputTool } from './executions/get-node-output.tool';
import { createListExecutionsTool } from './executions/list-executions.tool';
import { createRunWorkflowTool } from './executions/run-workflow.tool';
import { createStopExecutionTool } from './executions/stop-execution.tool';
import { createToolsFromLocalMcpServer } from './filesystem/create-tools-from-mcp-server';
import { createGetFileTreeTool } from './filesystem/get-file-tree.tool';
import { createListFilesTool } from './filesystem/list-files.tool';
import { createReadFileTool } from './filesystem/read-file.tool';
import { createSearchFilesTool } from './filesystem/search-files.tool';
import { createExploreNodeResourcesTool } from './nodes/explore-node-resources.tool';
import { createGetNodeDescriptionTool } from './nodes/get-node-description.tool';
import { createGetNodeTypeDefinitionTool } from './nodes/get-node-type-definition.tool';
import { createGetSuggestedNodesTool } from './nodes/get-suggested-nodes.tool';
import { createListNodesTool } from './nodes/list-nodes.tool';
import { createSearchNodesTool } from './nodes/search-nodes.tool';
import { createBrowserCredentialSetupTool } from './orchestration/browser-credential-setup.tool';
import { createBuildWorkflowAgentTool } from './orchestration/build-workflow-agent.tool';
import { createCancelBackgroundTaskTool } from './orchestration/cancel-background-task.tool';
import { createCorrectBackgroundTaskTool } from './orchestration/correct-background-task.tool';
import { createDataTableAgentTool } from './orchestration/data-table-agent.tool';
import { createDelegateTool } from './orchestration/delegate.tool';
import { createReportVerificationVerdictTool } from './orchestration/report-verification-verdict.tool';
import { createResearchWithAgentTool } from './orchestration/research-with-agent.tool';
import { createUpdateTasksTool } from './orchestration/update-tasks.tool';
import { createAskUserTool } from './shared/ask-user.tool';
import { createSearchTemplateParametersTool } from './templates/search-template-parameters.tool';
import { createSearchTemplateStructuresTool } from './templates/search-template-structures.tool';
import { createFetchUrlTool } from './web-research/fetch-url.tool';
import { createWebSearchTool } from './web-research/web-search.tool';
import { createBuildWorkflowTool } from './workflows/build-workflow.tool';
import { createDeleteWorkflowTool } from './workflows/delete-workflow.tool';
import { createGetWorkflowAsCodeTool } from './workflows/get-workflow-as-code.tool';
import { createGetWorkflowVersionTool } from './workflows/get-workflow-version.tool';
import { createGetWorkflowTool } from './workflows/get-workflow.tool';
import { createListWorkflowVersionsTool } from './workflows/list-workflow-versions.tool';
import { createListWorkflowsTool } from './workflows/list-workflows.tool';
import { createPatchWorkflowTool } from './workflows/patch-workflow.tool';
import { createPublishWorkflowTool } from './workflows/publish-workflow.tool';
import { createRestoreWorkflowVersionTool } from './workflows/restore-workflow-version.tool';
import { createUnpublishWorkflowTool } from './workflows/unpublish-workflow.tool';
import { createCleanupTestExecutionsTool } from './workspace/cleanup-test-executions.tool';
import { createCreateFolderTool } from './workspace/create-folder.tool';
import { createDeleteFolderTool } from './workspace/delete-folder.tool';
import { createListFoldersTool } from './workspace/list-folders.tool';
import { createListProjectsTool } from './workspace/list-projects.tool';
import { createListTagsTool } from './workspace/list-tags.tool';
import { createMoveWorkflowToFolderTool } from './workspace/move-workflow-to-folder.tool';
import { createTagWorkflowTool } from './workspace/tag-workflow.tool';

/**
 * Creates all native n8n tools for the instance agent.
 * Each tool captures the InstanceAiContext via closure for service access.
 */
export function createAllTools(context: InstanceAiContext) {
	return {
		'list-workflows': createListWorkflowsTool(context),
		'get-workflow': createGetWorkflowTool(context),
		'get-workflow-as-code': createGetWorkflowAsCodeTool(context),
		'build-workflow': createBuildWorkflowTool(context),
		'delete-workflow': createDeleteWorkflowTool(context),
		'publish-workflow': createPublishWorkflowTool(context),
		'unpublish-workflow': createUnpublishWorkflowTool(context),
		'list-executions': createListExecutionsTool(context),
		'run-workflow': createRunWorkflowTool(context),
		'get-execution': createGetExecutionTool(context),
		'debug-execution': createDebugExecutionTool(context),
		'get-node-output': createGetNodeOutputTool(context),
		'stop-execution': createStopExecutionTool(context),
		'list-credentials': createListCredentialsTool(context),
		'get-credential': createGetCredentialTool(context),
		'delete-credential': createDeleteCredentialTool(context),
		'setup-credentials': createSetupCredentialsTool(context),
		'test-credential': createTestCredentialTool(context),
		'list-nodes': createListNodesTool(context),
		'get-node-description': createGetNodeDescriptionTool(context),
		'get-node-type-definition': createGetNodeTypeDefinitionTool(context),
		'search-nodes': createSearchNodesTool(context),
		'get-suggested-nodes': createGetSuggestedNodesTool(),
		'explore-node-resources': createExploreNodeResourcesTool(context),
		'search-template-structures': createSearchTemplateStructuresTool(),
		'search-template-parameters': createSearchTemplateParametersTool(),
		'get-best-practices': createGetBestPracticesTool(),
		'list-data-tables': createListDataTablesTool(context),
		'create-data-table': createCreateDataTableTool(context),
		'delete-data-table': createDeleteDataTableTool(context),
		'get-data-table-schema': createGetDataTableSchemaTool(context),
		'add-data-table-column': createAddDataTableColumnTool(context),
		'delete-data-table-column': createDeleteDataTableColumnTool(context),
		'rename-data-table-column': createRenameDataTableColumnTool(context),
		'query-data-table-rows': createQueryDataTableRowsTool(context),
		'insert-data-table-rows': createInsertDataTableRowsTool(context),
		'update-data-table-rows': createUpdateDataTableRowsTool(context),
		'delete-data-table-rows': createDeleteDataTableRowsTool(context),
		'ask-user': createAskUserTool(),
		'fetch-url': createFetchUrlTool(context),
		...(context.webResearchService?.search ? { 'web-search': createWebSearchTool(context) } : {}),
		...(context.workflowService.patchNode
			? { 'patch-workflow': createPatchWorkflowTool(context) }
			: {}),
		...(context.workflowService.listVersions
			? {
					'list-workflow-versions': createListWorkflowVersionsTool(context),
					'get-workflow-version': createGetWorkflowVersionTool(context),
					'restore-workflow-version': createRestoreWorkflowVersionTool(context),
				}
			: {}),
		...(context.workspaceService
			? {
					'list-projects': createListProjectsTool(context),
					'list-folders': createListFoldersTool(context),
					'create-folder': createCreateFolderTool(context),
					'delete-folder': createDeleteFolderTool(context),
					'move-workflow-to-folder': createMoveWorkflowToFolderTool(context),
					'tag-workflow': createTagWorkflowTool(context),
					'list-tags': createListTagsTool(context),
					'cleanup-test-executions': createCleanupTestExecutionsTool(context),
				}
			: {}),
		...(context.localMcpServer
			? createToolsFromLocalMcpServer(context.localMcpServer)
			: context.filesystemService
				? {
						'list-files': createListFilesTool(context),
						'read-file': createReadFileTool(context),
						'search-files': createSearchFilesTool(context),
						'get-file-tree': createGetFileTreeTool(context),
					}
				: {}),
	};
}

/**
 * Creates orchestration-only tools (plan + delegate).
 * These tools are given to the orchestrator agent but never to sub-agents.
 */
export function createOrchestrationTools(context: OrchestrationContext) {
	return {
		'update-tasks': createUpdateTasksTool(context),
		delegate: createDelegateTool(context),
		'build-workflow-with-agent': createBuildWorkflowAgentTool(context),
		'manage-data-tables-with-agent': createDataTableAgentTool(context),
		...('web-search' in context.domainTools && context.researchMode
			? {
					'research-with-agent': createResearchWithAgentTool(context),
				}
			: {}),
		...(context.cancelBackgroundTask
			? { 'cancel-background-task': createCancelBackgroundTaskTool(context) }
			: {}),
		...(context.sendCorrectionToTask
			? { 'correct-background-task': createCorrectBackgroundTaskTool(context) }
			: {}),
		...(context.browserMcpConfig
			? {
					'browser-credential-setup': createBrowserCredentialSetupTool(context),
				}
			: {}),
		...(context.reportVerificationVerdict
			? {
					'report-verification-verdict': createReportVerificationVerdictTool(context),
				}
			: {}),
	};
}
