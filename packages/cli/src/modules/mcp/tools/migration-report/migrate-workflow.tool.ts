import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import { WorkflowMigrationNodeError } from '@/modules/breaking-changes/breaking-changes.migration.service';

import {
	MCP_GET_MIGRATION_FINDINGS_TOOL_NAME,
	MCP_MIGRATE_WORKFLOW_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { trackAndReturnToolError } from '../tool-error.utils';
import { getMcpWorkflow } from '../workflow-validation.utils';
import {
	getWorkflowUrl,
	readWorkflowMigrationFindings,
	workflowMigrationFindingsSchema,
	type MigrationReportToolDeps,
} from './migration-report.utils';

const inputSchema = {
	ruleId: z
		.string()
		.min(1)
		.describe(
			`The ruleId of a rule whose migratable flag is true, from ${MCP_GET_MIGRATION_FINDINGS_TOOL_NAME}`,
		),
	workflowId: z.string().min(1).describe('The ID of a workflow the rule flags'),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean(),
	workflowId: z.string(),
	url: z.string().optional(),
	newVersionId: z.string().optional().describe('The draft version the fix was saved as'),
	migratedNodeIds: z.array(z.string()).optional(),
	unmapped: z
		.array(z.string())
		.optional()
		.describe('Parameters the fix could not carry over. Tell the user about each one.'),
	notes: z
		.array(z.string())
		.optional()
		.describe('Behavior or output changes. Tell the user about each one.'),
	republishable: z
		.boolean()
		.optional()
		.describe(
			'True when the fixed version replaced the published one cleanly and can be published again as is',
		),
	migrationFindings: workflowMigrationFindingsSchema.optional(),
	error: z.string().optional(),
	nodeId: z.string().optional().describe('The node the fix refused, when it refused one'),
	nodeName: z.string().optional(),
} satisfies z.ZodRawShape;

type MigrateWorkflowParams = {
	ruleId: string;
	workflowId: string;
};

export const createMigrateWorkflowTool = (
	user: User,
	deps: MigrationReportToolDeps,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_MIGRATE_WORKFLOW_TOOL_NAME,
	config: {
		description:
			"Apply a migration report rule's built-in fix to one workflow. Works only for rules whose migratable flag is true. " +
			'The fix rewrites the flagged nodes and saves the result as a new draft version; it never publishes. ' +
			'Prefer it to editing the nodes by hand for migratable rules. ' +
			'The result lists the findings still open on the workflow, so no extra check is needed. ' +
			'Afterwards, tell the user about every unmapped parameter and note. If the workflow was published, publish it again with publish_workflow only after the user agrees.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Migrate Workflow',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({ ruleId, workflowId }: MigrateWorkflowParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_MIGRATE_WORKFLOW_TOOL_NAME,
			parameters: { ruleId, workflowId },
		};

		try {
			if (!deps.migrationRegistry.has(ruleId)) {
				throw new UserError(
					`Rule '${ruleId}' has no built-in fix. Fix the workflow with update_workflow, following the rule's recommendations.`,
				);
			}

			// The same gate every MCP write applies: access, not archived, available in MCP.
			await getMcpWorkflow(workflowId, user, ['workflow:update'], deps.workflowFinderService);
			await deps.collaborationService.ensureWorkflowEditable(workflowId);

			const result = await deps.migrationService.migrateWorkflow(ruleId, workflowId, user, {
				source: 'n8n-mcp',
			});

			void deps.collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

			// The fix is saved at this point, so a failed read leaves the field out rather than
			// reporting the migration as failed.
			const migrationFindings = await readWorkflowMigrationFindings(deps, workflowId).catch(
				(error: unknown) => {
					deps.logger.warn('Reading migration findings after a migration failed', {
						workflowId,
						error,
					});
					return undefined;
				},
			);

			const output = {
				success: true,
				...result,
				url: getWorkflowUrl(deps.urlService, workflowId),
				...(migrationFindings ? { migrationFindings } : {}),
			};

			telemetryPayload.results = {
				success: true,
				data: {
					rule_id: ruleId,
					migrated_nodes: result.migratedNodeIds.length,
					unmapped: result.unmapped.length,
					notes: result.notes.length,
					republishable: result.republishable,
				},
			};
			deps.telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			return trackAndReturnToolError(deps.telemetry, telemetryPayload, error, (message) => ({
				success: false,
				workflowId,
				error: message,
				...(error instanceof WorkflowMigrationNodeError ? error.meta : {}),
			}));
		}
	},
});
