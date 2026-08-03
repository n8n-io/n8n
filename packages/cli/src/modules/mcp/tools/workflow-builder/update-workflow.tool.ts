import type { GlobalConfig } from '@n8n/config';
import { type User, type SharedWorkflowRepository } from '@n8n/db';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { TagService } from '@/services/tag.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import { resolveNodeWebhookIds } from '@/workflow-helpers';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import { validateCredentialReferences } from './credential-validation';
import { trackAutoassignOutcomes } from './credentials-auto-assign';
import { validateDataTableReferencesForUpdate } from './data-table-validation';
import {
	buildInputSchema,
	buildToolDescription,
	outputSchema,
	parseStrictOperations,
	type OperationInput,
} from './partial-update-schemas';
import {
	assertOperationsSupported,
	autoAssignCredentialsForAddedNodes,
	buildUpdateOutput,
	buildUpdateTelemetryPayload,
	buildWorkflowUpdateEntity,
	collectTouchedNodes,
	collectValidationWarnings,
	isSettingsOperation,
	isTagOperation,
	resolveNodeGroupViolations,
	resolveTagIds,
} from './partial-update-steps';
import { sanitizeSkillsUsed } from './skills-used';
import { buildUpdateVersionMetadata, resolveVersionMetadata } from './version-metadata';
import { applyOperations, toWorkflowSlice } from './workflow-operations';
import {
	assertPublishAllowedForSettingsChange,
	assertWorkflowSettingsValid,
	type WorkflowSettingsGuardDependencies,
} from './workflow-settings-guards';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition } from '../../mcp.types';
import { getMcpWorkflow } from '../workflow-validation.utils';

/**
 * MCP tool that updates a workflow by applying a small list of named operations
 * (addNode, removeNode, updateNodeParameters, addConnection, …) directly to the
 * stored JSON. The agent emits a tiny diff per call instead of re-sending the
 * full SDK code, which keeps output-token cost roughly constant per edit.
 *
 * Graph + JSON validation runs on the resulting workflow before save, so the
 * end-state safety net matches the create-from-code path; only the
 * TS-code → JSON parse step is skipped.
 */
export const createUpdateWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	urlService: UrlService,
	telemetry: Telemetry,
	nodeTypes: NodeTypes,
	credentialsService: CredentialsService,
	sharedWorkflowRepository: SharedWorkflowRepository,
	collaborationService: CollaborationService,
	dataTableOps: DataTableUserOperations,
	tagService: TagService,
	globalConfig: GlobalConfig,
	subworkflowPolicyChecker: SubworkflowPolicyChecker,
	workflowPublishedDataService: WorkflowPublishedDataService,
	aiGatewayService: AiGatewayService,
	options: {
		/**
		 * `102_mcp_canvas_groups` rollout flag: when true, the granular node-group
		 * operations (addNodeGroup, removeNodeGroup, updateNodeGroup) are published
		 * in the tool schema and accepted by the handler. `setNodeGroups` predates
		 * the flag and is always available.
		 */
		canvasGroupsEnabled?: boolean;
	} = {},
): ToolDefinition<ReturnType<typeof buildInputSchema>> => {
	// Bound once: these never vary per call, so the call sites below show only
	// what is being validated.
	const settingsGuardDependencies: WorkflowSettingsGuardDependencies = {
		user,
		nodeTypes,
		globalConfig,
		workflowFinderService,
		workflowPublishedDataService,
		subworkflowPolicyChecker,
	};

	return {
		name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
		config: {
			description: buildToolDescription(options.canvasGroupsEnabled === true),
			inputSchema: buildInputSchema(options.canvasGroupsEnabled === true),
			outputSchema,
			annotations: {
				title: MCP_UPDATE_WORKFLOW_TOOL.displayTitle,
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
		},
		handler: async ({
			workflowId,
			skillsUsed,
			operations,
			versionName,
			versionDescription,
		}: {
			workflowId: string;
			skillsUsed?: string[];
			operations: OperationInput[];
			versionName?: string;
			versionDescription?: string;
		}) => {
			// Held outside the `try` so the catch below can report on it.
			const telemetryPayload = buildUpdateTelemetryPayload({
				userId: user.id,
				workflowId,
				operations,
				sanitizedSkillsUsed: sanitizeSkillsUsed(skillsUsed),
				versionName,
				versionDescription,
			});

			try {
				const strictOperations = parseStrictOperations(operations);
				const hasTagOperations = strictOperations.some(isTagOperation);
				const hasNonTagOperations = strictOperations.some((op) => !isTagOperation(op));
				const hasSettingsOperations = strictOperations.some(isSettingsOperation);
				const canvasGroupsEnabled = options.canvasGroupsEnabled === true;

				assertOperationsSupported({
					strictOperations,
					canvasGroupsEnabled,
					tagsDisabled: globalConfig.tags.disabled,
				});

				const existingWorkflow = await getMcpWorkflow(
					workflowId,
					user,
					['workflow:update'],
					workflowFinderService,
					{ includeTags: hasTagOperations },
				);

				await collaborationService.ensureWorkflowEditable(existingWorkflow.id);

				const result = applyOperations(
					toWorkflowSlice(existingWorkflow, { includeTags: hasTagOperations }),
					strictOperations,
					{ canvasGroupsEnabled },
				);

				if (!result.success) {
					throw new Error(result.error);
				}

				const { skippedOperations, removedGroups, nodeGroupsNeedPersisting } =
					resolveNodeGroupViolations({ result, canvasGroupsEnabled }, { nodeTypes });

				const credentialCheck = await validateCredentialReferences(
					strictOperations,
					existingWorkflow,
					user,
					credentialsService,
					nodeTypes,
					{ workflowId: existingWorkflow.id },
				);

				if (!credentialCheck.ok) {
					throw new Error(credentialCheck.error);
				}

				const invalidToolSourceResponse = buildInvalidAiToolSourceErrorResponse(
					{ nodes: result.workflow.nodes, connections: result.workflow.connections },
					nodeTypes,
					(errorMessage) => ({ error: errorMessage }),
					telemetryPayload,
					telemetry,
				);

				if (invalidToolSourceResponse) {
					return invalidToolSourceResponse;
				}

				const { projectId: workflowProjectId } = await sharedWorkflowRepository.findOneOrFail({
					where: { workflowId, role: 'workflow:owner' },
					select: ['projectId'],
				});

				const dataTableCheck = await validateDataTableReferencesForUpdate(
					result.workflow.nodes,
					collectTouchedNodes(strictOperations),
					workflowProjectId,
					dataTableOps,
				);

				if (!dataTableCheck.ok) {
					throw new Error(dataTableCheck.error);
				}

				await assertWorkflowSettingsValid(
					{ strictOperations, settings: result.workflow.settings, workflowId },
					settingsGuardDependencies,
				);

				await assertPublishAllowedForSettingsChange(
					{
						hasSettingsOperations,
						activeVersionId: existingWorkflow.activeVersionId,
						workflowId,
					},
					settingsGuardDependencies,
				);

				const workflowUpdateData = buildWorkflowUpdateEntity({
					workflow: result.workflow,
					existingMeta: existingWorkflow.meta,
					strictOperations,
					nodeGroupsNeedPersisting,
				});

				resolveNodeWebhookIds(workflowUpdateData, nodeTypes);

				const {
					assignments: credentialAssignments,
					skippedHttpNodes,
					outcomes: autoAssignOutcomes,
				} = await autoAssignCredentialsForAddedNodes(
					{
						workflowUpdateData,
						addedNodeNames: result.addedNodeNames,
						projectId: workflowProjectId,
					},
					{ user, nodeTypes, credentialsService, aiGatewayService },
				);

				// After auto-assign, so the nodes being validated carry their credentials.
				const validationWarnings = await collectValidationWarnings(
					{ updated: workflowUpdateData, existing: existingWorkflow },
					{ nodeTypes },
				);

				const tagIds = await resolveTagIds({ tagNames: result.tagNames }, { user, tagService });

				// Fallback is diff-based; it only ends up persisted when the update
				// actually produces a new history version (node/connection/group changes).
				const versionMetadata = resolveVersionMetadata(
					{ versionName, versionDescription },
					buildUpdateVersionMetadata(
						{ nodes: existingWorkflow.nodes, connections: existingWorkflow.connections },
						{ nodes: workflowUpdateData.nodes, connections: workflowUpdateData.connections },
					),
				);

				const updatedWorkflow = await workflowService.update(user, workflowUpdateData, workflowId, {
					aiBuilderAssisted: hasNonTagOperations,
					source: 'n8n-mcp',
					versionName: versionMetadata.name,
					versionDescription: versionMetadata.description,
					...(tagIds !== undefined ? { tagIds } : {}),
				});

				if (autoAssignOutcomes.length > 0) {
					const nodeTypesByName = new Map(updatedWorkflow.nodes.map((n) => [n.name, n.type]));
					trackAutoassignOutcomes(
						telemetry,
						user.id,
						'update_workflow',
						autoAssignOutcomes,
						nodeTypesByName,
						workflowId,
					);
				}

				void collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

				const baseUrl = urlService.getInstanceBaseUrl();
				const workflowUrl = `${baseUrl}/workflow/${updatedWorkflow.id}`;

				telemetryPayload.results = {
					success: true,
					data: {
						workflowId: updatedWorkflow.id,
						nodeCount: updatedWorkflow.nodes.length,
					},
				};

				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				const output = buildUpdateOutput({
					updatedWorkflow,
					workflowUrl,
					operationCount: strictOperations.length,
					skippedOperations,
					groupOperations: result.groupOperations,
					removedGroups,
					credentialAssignments,
					validationWarnings,
					skippedHttpNodes,
					hasSettingsOperations,
				});

				return {
					content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
					structuredContent: output,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);

				telemetryPayload.results = {
					success: false,
					error: errorMessage,
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				const output = { error: errorMessage };

				return {
					content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
					structuredContent: output,
					isError: true,
				};
			}
		},
	};
};
