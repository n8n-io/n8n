import {
	migrationFindingTriageStatusSchema,
	type MigrationFindingTriageStatus,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import z from 'zod';

import {
	MCP_GET_MIGRATION_FINDINGS_TOOL_NAME,
	MCP_SET_MIGRATION_FINDING_STATUS_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { trackAndReturnToolError } from '../tool-error.utils';
import { getMcpWorkflow } from '../workflow-validation.utils';
import type { MigrationReportToolDeps } from './migration-report.utils';

const inputSchema = {
	ruleId: z
		.string()
		.min(1)
		.describe(`The ruleId of a workflow rule, from ${MCP_GET_MIGRATION_FINDINGS_TOOL_NAME}`),
	workflowId: z.string().min(1).describe('The ID of a workflow the rule flags'),
	status: z
		.enum(migrationFindingTriageStatusSchema.options)
		.describe('wont_fix: the user accepts the change for this workflow. open: undo that.'),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean(),
	ruleId: z.string(),
	workflowId: z.string(),
	status: z.enum(migrationFindingTriageStatusSchema.options).optional(),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

type SetMigrationFindingStatusParams = {
	ruleId: string;
	workflowId: string;
	status: MigrationFindingTriageStatus;
};

export const createSetMigrationFindingStatusTool = (
	user: User,
	deps: MigrationReportToolDeps,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_SET_MIGRATION_FINDING_STATUS_TOOL_NAME,
	config: {
		description:
			'Set the status of one migration report finding: wont_fix when the user decides to keep the workflow as it is, open to undo that. ' +
			'A wont_fix finding counts as resolved in the report. ' +
			'Only set wont_fix after the user explicitly accepts the change for this workflow, never to hide an issue you can fix. ' +
			'You do not need this tool to mark a fix: the report marks a finding fixed on its own after the workflow is saved without the issue.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Set Migration Finding Status',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ ruleId, workflowId, status }: SetMigrationFindingStatusParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_SET_MIGRATION_FINDING_STATUS_TOOL_NAME,
			parameters: { ruleId, workflowId, status },
		};

		try {
			// MCP only acts on workflows the user can edit and made available in MCP.
			await getMcpWorkflow(workflowId, user, ['workflow:update'], deps.workflowFinderService);
			await deps.triageService.setStatus(ruleId, workflowId, status);

			const output = { success: true, ruleId, workflowId, status };

			telemetryPayload.results = { success: true, data: { rule_id: ruleId, status } };
			deps.telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			return trackAndReturnToolError(deps.telemetry, telemetryPayload, error, (message) => ({
				success: false,
				ruleId,
				workflowId,
				error: message,
			}));
		}
	},
});
