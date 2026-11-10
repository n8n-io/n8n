import {
	breakingChangeWorkflowIssueSchema,
	migrationFindingListedStatusSchema,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { OperationalError, UserError } from 'n8n-workflow';
import z from 'zod';

import { resolveReportScope } from '@/modules/breaking-changes/query/report-scope';
import { isWorkflowLevelRule } from '@/modules/breaking-changes/types';

import {
	MCP_GET_MIGRATION_FINDINGS_TOOL_NAME,
	MCP_GET_MIGRATION_REPORT_TOOL_NAME,
	MCP_MIGRATE_WORKFLOW_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { createLimitSchema } from '../schemas';
import { trackAndReturnToolError } from '../tool-error.utils';
import { toolResult } from '../tool-result.utils';
import { getMcpWorkflow } from '../workflow-validation.utils';
import {
	byImpact,
	getReportUrl,
	getWorkflowUrl,
	toWorkflowRuleOutput,
	workflowRuleOutputShape,
	INCOMPLETE_REPORT_NOTE,
	incompleteReportShape,
	type MigrationReportToolDeps,
} from './migration-report.utils';

const MAX_RESULTS = 100;
const DEFAULT_LIMIT = 50;

const inputSchema = {
	ruleId: z
		.string()
		.min(1)
		.optional()
		.describe(
			`List the workflows this rule flags. A ruleId from the workflowRules of ${MCP_GET_MIGRATION_REPORT_TOOL_NAME}.`,
		),
	workflowId: z
		.string()
		.min(1)
		.optional()
		.describe(
			'List what the report flags on this one workflow, re-checked against its current version. Combine with ruleId to check one rule.',
		),
	limit: createLimitSchema(MAX_RESULTS),
} satisfies z.ZodRawShape;

const workflowEntrySchema = z.object({
	workflowId: z.string(),
	name: z.string(),
	url: z.string(),
	published: z.boolean().describe('Whether the workflow has a published version'),
	status: migrationFindingListedStatusSchema.describe(
		'open: still to fix. notified: still to fix, and the owner got a notification. fixed_unpublished: fixed in the draft, and resolved when the workflow is published. wont_fix: a user accepted the change',
	),
	availableInMCP: z
		.boolean()
		.describe('MCP tools can only read and edit the workflow when this is true'),
	numberOfExecutions: z.number().int().min(0).optional(),
	lastExecutedAt: z.string().optional(),
	issues: z
		.array(breakingChangeWorkflowIssueSchema)
		.optional()
		.describe('What to fix, per node. Left out when the workflow is not available in MCP.'),
});

const outputSchema = {
	reportUrl: z.string().describe('The migration report page in the n8n editor'),
	rules: z
		.array(
			z.object({
				...workflowRuleOutputShape,
				totalWorkflows: z
					.number()
					.int()
					.min(0)
					.describe('Workflows with an open, notified, or wont_fix finding for this rule'),
				workflows: z.array(workflowEntrySchema),
				truncated: z.boolean().optional().describe('The limit cut the list short'),
			}),
		)
		.describe('The rules with findings, most severe first, each with the workflows it flags'),
	...incompleteReportShape,
	note: z.string().optional(),
} satisfies z.ZodRawShape;

type Output = z.infer<z.ZodObject<typeof outputSchema>>;

export const createGetMigrationFindingsTool = (
	user: User,
	deps: MigrationReportToolDeps,
): ToolDefinition<typeof inputSchema> => {
	const assertWorkflowRule = (ruleId: string) => {
		const rule = deps.ruleRegistry.getRule(ruleId);
		if (!rule || !isWorkflowLevelRule(rule) || rule.getMetadata().version !== deps.targetVersion) {
			throw new UserError(
				`No workflow rule with ID '${ruleId}' in the ${deps.targetVersion} migration report. Use a ruleId from the workflowRules of ${MCP_GET_MIGRATION_REPORT_TOOL_NAME}.`,
			);
		}
	};

	/** Every workflow one rule flags, within what the user may read. */
	const findingsOfRule = async (ruleId: string, limit: number): Promise<Output> => {
		// A partial scan is not recorded, so the next read scans again.
		const [scope, complete] = await Promise.all([
			resolveReportScope(user, deps.workflowFinderService),
			deps.syncService.syncIfStale(deps.targetVersion),
		]);
		const detail = await deps.queryService.getRuleFindings(deps.targetVersion, ruleId, scope);

		// Unresolved findings first: they are the ones left to fix.
		const findings = detail.affectedWorkflows
			.filter((workflow) => !workflow.isArchived)
			.sort((a, b) => Number(a.status === 'wont_fix') - Number(b.status === 'wont_fix'));
		const shown = findings.slice(0, limit);

		const availableInMcp = await deps.workflowRepository.findMcpAvailabilityByIds(
			shown.map((finding) => finding.id),
		);

		const workflows = shown.map((finding) => {
			const available = availableInMcp.get(finding.id) === true;
			return {
				workflowId: finding.id,
				name: finding.name,
				url: getWorkflowUrl(deps.urlService, finding.id),
				published: finding.active,
				status: finding.status,
				availableInMCP: available,
				numberOfExecutions: finding.numberOfExecutions,
				...(finding.lastExecutedAt
					? { lastExecutedAt: new Date(finding.lastExecutedAt).toISOString() }
					: {}),
				// Node names and issue text describe the workflow's content, which MCP only
				// reads for workflows the user made available in MCP.
				...(available ? { issues: finding.issues } : {}),
			};
		});

		const unavailableCount = workflows.filter((workflow) => !workflow.availableInMCP).length;
		const notes = [
			...(complete ? [] : [INCOMPLETE_REPORT_NOTE]),
			...(unavailableCount > 0
				? [
						`${unavailableCount} of these workflows are not available in MCP, so their issues are hidden and MCP tools cannot edit them. Ask the user to turn on MCP access for them in the workflow settings, or to fix them in the n8n editor.`,
					]
				: []),
		];
		return {
			reportUrl: getReportUrl(deps.urlService, ruleId),
			rules: [
				{
					...toWorkflowRuleOutput(deps.ruleRegistry, detail),
					totalWorkflows: findings.length,
					workflows,
					...(findings.length > shown.length ? { truncated: true } : {}),
				},
			],
			...(complete ? {} : { incomplete: true }),
			...(notes.length > 0 ? { note: notes.join(' ') } : {}),
		};
	};

	/** Every rule that flags one workflow, re-checked against the workflow as it is now. */
	const findingsOfWorkflow = async (workflowId: string, ruleId?: string): Promise<Output> => {
		// The same gate every MCP read of workflow content applies, narrowed to the workflows
		// the report shows a user: the ones they can edit.
		const workflow = await getMcpWorkflow(
			workflowId,
			user,
			['workflow:update'],
			deps.workflowFinderService,
		);
		// A failed re-check leaves the table stale for this workflow, so it must not be reported.
		if (!(await deps.syncService.syncWorkflow(workflowId))) {
			throw new OperationalError(
				'Could not re-check this workflow against the migration report. Try again.',
			);
		}
		const findings = (
			(await deps.queryService.getWorkflowFindings(deps.targetVersion, workflowId)) ?? []
		)
			.filter((finding) => ruleId === undefined || finding.ruleId === ruleId)
			.map((finding) => ({
				...toWorkflowRuleOutput(deps.ruleRegistry, finding),
				totalWorkflows: 1,
				workflows: [
					{
						workflowId,
						name: workflow.name,
						url: getWorkflowUrl(deps.urlService, workflowId),
						published: !!workflow.activeVersionId,
						status: finding.status,
						availableInMCP: true,
						issues: finding.issues,
					},
				],
			}))
			.sort(byImpact);

		return {
			reportUrl: getReportUrl(deps.urlService, ruleId),
			rules: findings,
			...(findings.length === 0
				? {
						note: `The ${deps.targetVersion} migration report flags nothing on this workflow${ruleId ? ' for this rule' : ''}.`,
					}
				: {}),
		};
	};

	return {
		name: MCP_GET_MIGRATION_FINDINGS_TOOL_NAME,
		config: {
			description:
				'List what the migration report flags, with the affected nodes and how to fix them. ' +
				`Pass a ruleId from the workflowRules of ${MCP_GET_MIGRATION_REPORT_TOOL_NAME} to list the workflows that rule flags, or a workflowId to list every rule that flags that workflow. ` +
				`When the rule is migratable, fix the workflow with ${MCP_MIGRATE_WORKFLOW_TOOL_NAME}. Otherwise, the rule's assistantAction says what to do. ` +
				"For fix, follow the rule's recommendations with the workflow tools (get_workflow_details, then update_workflow). " +
				'For review, explain what changes for the workflow and change the workflow only after the user agrees. ' +
				'For none, tell the user what the recommendations say and change the workflow only when the user asks for it. ' +
				'If the workflow tools are not available, this connection cannot edit workflows: tell the user, and list what to fix instead. ' +
				'You do not need to call this tool again after a fix: update_workflow and migrate_workflow report what is still open on the workflow they saved. ' +
				'Workflows that are not available in MCP are listed without their issues, and MCP tools cannot edit them.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Get Migration Findings',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ ruleId, workflowId, limit = DEFAULT_LIMIT }) => {
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: MCP_GET_MIGRATION_FINDINGS_TOOL_NAME,
				parameters: { ruleId, workflowId, limit },
			};

			try {
				if (ruleId !== undefined) assertWorkflowRule(ruleId);

				let payload: Output;
				if (workflowId !== undefined) {
					payload = await findingsOfWorkflow(workflowId, ruleId);
				} else if (ruleId !== undefined) {
					payload = await findingsOfRule(ruleId, Math.min(Math.max(1, limit), MAX_RESULTS));
				} else {
					throw new UserError('Pass a ruleId, a workflowId, or both.');
				}

				telemetryPayload.results = {
					success: true,
					data: {
						mode: workflowId !== undefined ? 'workflow' : 'rule',
						rules: payload.rules.length,
						total_workflows: payload.rules.reduce((sum, rule) => sum + rule.totalWorkflows, 0),
					},
				};
				deps.telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return toolResult(payload);
			} catch (error) {
				return trackAndReturnToolError(deps.telemetry, telemetryPayload, error);
			}
		},
	};
};
