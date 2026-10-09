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
import { getMcpWorkflow } from '../workflow-validation.utils';
import {
	byImpact,
	getReportUrl,
	getWorkflowUrl,
	issueSchema,
	ruleOutputShape,
	toRuleOutput,
	workflowRuleResolution,
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
	status: z
		.enum(['open', 'wont_fix'])
		.describe('open: still to fix. wont_fix: a user accepted the change'),
	availableInMCP: z
		.boolean()
		.describe('MCP tools can only read and edit the workflow when this is true'),
	numberOfExecutions: z.number().int().min(0).optional(),
	lastExecutedAt: z.string().optional(),
	issues: z
		.array(issueSchema)
		.optional()
		.describe('What to fix, per node. Left out when the workflow is not available in MCP.'),
});

const outputSchema = {
	reportUrl: z.string().describe('The migration report page in the n8n editor'),
	rules: z
		.array(
			z.object({
				...ruleOutputShape,
				totalWorkflows: z
					.number()
					.int()
					.min(0)
					.describe('Workflows with an open or wont_fix finding for this rule'),
				workflows: z.array(workflowEntrySchema),
				truncated: z.boolean().optional().describe('The limit cut the list short'),
			}),
		)
		.describe('The rules with findings, most severe first, each with the workflows it flags'),
	...incompleteReportShape,
	note: z.string().optional(),
} satisfies z.ZodRawShape;

type GetMigrationFindingsParams = {
	ruleId?: string;
	workflowId?: string;
	limit?: number;
};

type RuleFindings = ReturnType<typeof toRuleOutput> & {
	totalWorkflows: number;
	workflows: z.infer<typeof workflowEntrySchema>[];
	truncated?: true;
};

type Output = {
	reportUrl: string;
	rules: RuleFindings[];
	incomplete?: true;
	note?: string;
};

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
		const scope = await resolveReportScope(user, deps.workflowSharingService);
		// A partial scan is not recorded, so the next read scans again.
		const complete = await deps.syncService.syncIfStale(deps.targetVersion);
		const detail = await deps.queryService.getRuleFindings(deps.targetVersion, ruleId, scope);

		// Open findings first: they are the ones left to fix.
		const findings = [...detail.affectedWorkflows].sort(
			(a, b) => Number(a.status === 'wont_fix') - Number(b.status === 'wont_fix'),
		);
		const shown = findings.slice(0, limit);

		const workflowsWithSettings = await deps.workflowRepository.findByIds(
			shown.map((finding) => finding.id),
			{ fields: ['settings'] },
		);
		const availableInMcp = new Set(
			workflowsWithSettings
				.filter((workflow) => workflow.settings?.availableInMCP === true)
				.map((workflow) => workflow.id),
		);

		const workflows = shown.map((finding) => {
			const available = availableInMcp.has(finding.id);
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
					...toRuleOutput(detail, workflowRuleResolution(deps.ruleRegistry, ruleId)),
					totalWorkflows: findings.length,
					workflows,
					...(findings.length > shown.length ? { truncated: true as const } : {}),
				},
			],
			...(complete ? {} : { incomplete: true as const }),
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
		const findings = (await deps.queryService.getWorkflowFindings(deps.targetVersion, workflowId))
			.filter((finding) => ruleId === undefined || finding.ruleId === ruleId)
			.map((finding) => ({
				...toRuleOutput(finding, workflowRuleResolution(deps.ruleRegistry, finding.ruleId)),
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
				`Fix a workflow by following the rule's recommendations with the workflow tools (get_workflow_details, then update_workflow), or with ${MCP_MIGRATE_WORKFLOW_TOOL_NAME} when the rule is migratable. ` +
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
		handler: async ({ ruleId, workflowId, limit = DEFAULT_LIMIT }: GetMigrationFindingsParams) => {
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

				return {
					content: [{ type: 'text', text: JSON.stringify(payload) }],
					structuredContent: payload,
				};
			} catch (error) {
				return trackAndReturnToolError(deps.telemetry, telemetryPayload, error);
			}
		},
	};
};
