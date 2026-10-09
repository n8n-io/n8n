import type { User } from '@n8n/db';
import z from 'zod';

import { resolveReportScope } from '@/modules/breaking-changes/query/report-scope';

import {
	MCP_GET_MIGRATION_FINDINGS_TOOL_NAME,
	MCP_GET_MIGRATION_REPORT_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { trackAndRethrowToolError } from '../tool-error.utils';
import {
	byImpact,
	getReportUrl,
	ruleOutputShape,
	toRuleOutput,
	workflowRuleResolution,
	type MigrationReportToolDeps,
} from './migration-report.utils';

const inputSchema = {} satisfies z.ZodRawShape;

const outputSchema = {
	targetVersion: z.string().describe('The n8n version the report checks against, e.g. "v3"'),
	currentVersion: z.string().describe('The n8n version this instance runs'),
	generatedAt: z.string().describe('ISO timestamp of the last scan'),
	coverage: z
		.enum(['instance', 'editableWorkflows'])
		.describe(
			'instance: every workflow and the instance rules. editableWorkflows: only the workflows the user can edit, and no instance rules',
		),
	reportUrl: z.string().describe('The migration report page in the n8n editor'),
	totalWorkflows: z.number().int().min(0).describe('Workflows in coverage'),
	affectedWorkflows: z
		.number()
		.int()
		.min(0)
		.describe('Workflows with at least one open finding. A workflow counts once.'),
	workflowRules: z
		.array(
			z.object({
				...ruleOutputShape,
				openWorkflows: z.number().int().min(0).describe('Workflows with an open finding'),
				wontFixWorkflows: z
					.number()
					.int()
					.min(0)
					.describe('Workflows where a user accepted the change (counts as resolved)'),
			}),
		)
		.describe('Rules that flag workflows, most severe first'),
	instanceRules: z
		.array(
			z.object({
				...ruleOutputShape,
				issues: z.array(
					z.object({
						title: z.string(),
						description: z.string(),
						level: z.enum(['info', 'warning', 'error']),
					}),
				),
			}),
		)
		.describe(
			'Configuration, environment, or deployment changes, most severe first. No workflow edit fixes these.',
		),
} satisfies z.ZodRawShape;

export const createGetMigrationReportTool = (
	user: User,
	deps: MigrationReportToolDeps,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_GET_MIGRATION_REPORT_TOOL_NAME,
	config: {
		description:
			`Read the migration report for the upgrade to n8n ${deps.targetVersion}: the breaking changes that affect this instance, most severe first. ` +
			`Call it first when the user asks about upgrading to ${deps.targetVersion}, about breaking changes, or about the migration report. ` +
			`Workflow rules count the workflows with an open finding; call ${MCP_GET_MIGRATION_FINDINGS_TOOL_NAME} with a ruleId to see the affected workflows and nodes. ` +
			"Each rule's resolution says how its findings are resolved. " +
			'Instance rules are configuration, environment, or deployment changes that no workflow edit can fix: explain them to the user and link their documentation. ' +
			'A user who cannot edit every workflow sees only the workflows they can edit.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Migration Report',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_GET_MIGRATION_REPORT_TOOL_NAME,
			parameters: {},
		};

		try {
			const scope = await resolveReportScope(user, deps.workflowSharingService);
			// A first read, or a rule set that changed with an update, runs a full scan first.
			await deps.syncService.syncIfStale(deps.targetVersion);
			const { report, totalWorkflows, totalAffectedWorkflows } =
				await deps.queryService.getLightReport(deps.targetVersion, scope);

			const payload = {
				targetVersion: report.targetVersion,
				currentVersion: report.currentVersion,
				generatedAt: report.generatedAt.toISOString(),
				coverage:
					scope.kind === 'instance' ? ('instance' as const) : ('editableWorkflows' as const),
				reportUrl: getReportUrl(deps.urlService),
				totalWorkflows,
				affectedWorkflows: totalAffectedWorkflows,
				workflowRules: report.workflowResults
					.map((rule) => ({
						...toRuleOutput(rule, workflowRuleResolution(deps.ruleRegistry, rule.ruleId)),
						openWorkflows: rule.nbAffectedWorkflows,
						wontFixWorkflows: rule.nbWontFixWorkflows,
					}))
					.sort(byImpact),
				instanceRules: report.instanceResults
					.map((rule) => ({
						...toRuleOutput(rule, 'instanceConfiguration'),
						issues: rule.instanceIssues,
					}))
					.sort(byImpact),
			};

			telemetryPayload.results = {
				success: true,
				data: {
					coverage: payload.coverage,
					workflow_rules: payload.workflowRules.length,
					instance_rules: payload.instanceRules.length,
					affected_workflows: payload.affectedWorkflows,
				},
			};
			deps.telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			trackAndRethrowToolError(deps.telemetry, telemetryPayload, error);
		}
	},
});
