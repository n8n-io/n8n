import type {
	BreakingChangeLightReportResult,
	BreakingChangeRuleDetailResult,
	BreakingChangeRuleImpact,
	MigrationFindingTriageStatus,
	WorkflowMigrationResult,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { UrlService, type WorkflowSharingService } from '@n8n/backend-services';
import {
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	User,
	type WorkflowEntity,
	type WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import {
	WorkflowMigrationNodeError,
	type BreakingChangeMigrationService,
} from '@/modules/breaking-changes/breaking-changes.migration.service';
import type { MigrationRegistry } from '@/modules/breaking-changes/breaking-changes.migration-registry.service';
import type { RuleRegistry } from '@/modules/breaking-changes/breaking-changes.rule-registry.service';
import type {
	MigrationFindingQueryService,
	WorkflowFinding,
} from '@/modules/breaking-changes/query/migration-finding-query.service';
import type { MigrationFindingSyncService } from '@/modules/breaking-changes/sync/migration-finding-sync.service';
import type { MigrationFindingTriageService } from '@/modules/breaking-changes/triage/migration-finding-triage.service';
import {
	BreakingChangeCategory,
	type BreakingChangeRuleResolution,
	type IBreakingChangeInstanceRule,
	type IBreakingChangeWorkflowRule,
} from '@/modules/breaking-changes/types';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createGetMigrationFindingsTool } from '../tools/migration-report/get-migration-findings.tool';
import { createGetMigrationReportTool } from '../tools/migration-report/get-migration-report.tool';
import { createMigrateWorkflowTool } from '../tools/migration-report/migrate-workflow.tool';
import {
	readWorkflowMigrationFindings,
	type MigrationReportToolDeps,
} from '../tools/migration-report/migration-report.utils';
import { createSetMigrationFindingStatusTool } from '../tools/migration-report/set-migration-finding-status.tool';

const BASE_URL = 'https://n8n.example.com';

const owner = Object.assign(new User(), { id: 'owner-1', role: GLOBAL_OWNER_ROLE });
const member = Object.assign(new User(), { id: 'member-1', role: GLOBAL_MEMBER_ROLE });

const makeDeps = () => {
	const urlService = mock<UrlService>();
	urlService.getInstanceBaseUrl.mockReturnValue(BASE_URL);
	// The MCP access gate builds its settings link through the container.
	Container.set(UrlService, urlService);

	return {
		targetVersion: 'v3',
		ruleRegistry: mock<RuleRegistry>(),
		migrationRegistry: mock<MigrationRegistry>(),
		syncService: mock<MigrationFindingSyncService>(),
		queryService: mock<MigrationFindingQueryService>(),
		triageService: mock<MigrationFindingTriageService>(),
		migrationService: mock<BreakingChangeMigrationService>(),
		workflowSharingService: mock<WorkflowSharingService>(),
		workflowRepository: mock<WorkflowRepository>(),
		workflowFinderService: mock<WorkflowFinderService>(),
		collaborationService: mock<CollaborationService>(),
		urlService,
		telemetry: mock<Telemetry>(),
		logger: mock<Logger>(),
	} satisfies MigrationReportToolDeps;
};

const ruleFields = (ruleId: string, impact: BreakingChangeRuleImpact) => ({
	ruleId,
	ruleTitle: `${ruleId} title`,
	ruleDescription: `${ruleId} description`,
	ruleImpact: impact,
	recommendations: [{ action: 'Fix it', description: `How to fix ${ruleId}` }],
	migratable: false,
});

const workflowRule = (
	id: string,
	{
		version = 'v3',
		resolution,
	}: { version?: 'v2' | 'v3'; resolution?: BreakingChangeRuleResolution } = {},
): IBreakingChangeWorkflowRule => ({
	id,
	getMetadata: () => ({
		version,
		title: id,
		description: id,
		category: BreakingChangeCategory.workflow,
		impact: 'executionsFail',
		...(resolution ? { resolution } : {}),
	}),
	getRecommendations: async () => [],
	detectWorkflow: async () => ({ isAffected: false, issues: [] }),
});

const instanceRule = (id: string): IBreakingChangeInstanceRule => ({
	id,
	getMetadata: () => ({
		version: 'v3',
		title: id,
		description: id,
		category: BreakingChangeCategory.instance,
		impact: 'upgradeBlocked',
	}),
	detect: async () => ({ isAffected: false, instanceIssues: [], recommendations: [] }),
});

/** Registers the given rules by id. */
const withRules = (deps: ReturnType<typeof makeDeps>, ...rules: IBreakingChangeWorkflowRule[]) =>
	deps.ruleRegistry.getRule.mockImplementation((id) => rules.find((rule) => rule.id === id));

const workflowFinding = (
	ruleId: string,
	impact: BreakingChangeRuleImpact,
	status: MigrationFindingTriageStatus,
	nodeName = 'Old',
): WorkflowFinding => ({
	...ruleFields(ruleId, impact),
	status,
	issues: [
		{ title: `${ruleId} issue`, description: 'Gone', level: 'error', nodeId: 'n1', nodeName },
	],
});

/** A workflow as the MCP access gate reads it. */
const mcpWorkflow = (id: string, availableInMCP: boolean, activeVersionId: string | null = null) =>
	({
		id,
		name: `Workflow ${id}`,
		isArchived: false,
		activeVersionId,
		settings: { availableInMCP },
	}) as unknown as WorkflowEntity;

describe('get_migration_report', () => {
	const lightReport = (): BreakingChangeLightReportResult => ({
		report: {
			generatedAt: new Date('2026-10-08T12:00:00.000Z'),
			targetVersion: 'v3',
			currentVersion: '2.43.0',
			instanceResults: [
				{
					...ruleFields('task-runner-timeout', 'behaviorChanges'),
					instanceIssues: [{ title: 'Timeout', description: 'Lower default', level: 'warning' }],
				},
				{
					...ruleFields('docker-only', 'upgradeBlocked'),
					instanceIssues: [{ title: 'npm install', description: 'Use Docker', level: 'error' }],
				},
			],
			workflowResults: [
				{
					...ruleFields('embedded-chat', 'capabilityRemoved'),
					nbAffectedWorkflows: 1,
					nbWontFixWorkflows: 0,
				},
				{
					...ruleFields('removed-node', 'executionsFail'),
					nbAffectedWorkflows: 3,
					nbWontFixWorkflows: 1,
				},
			],
		},
		totalWorkflows: 12,
		totalAffectedWorkflows: 4,
		shouldCache: false,
	});

	it('reads the whole instance for a user who can edit every workflow, most severe first', async () => {
		const deps = makeDeps();
		withRules(
			deps,
			workflowRule('removed-node'),
			workflowRule('embedded-chat', { resolution: 'userConfirmation' }),
		);
		deps.queryService.getLightReport.mockResolvedValue(lightReport());

		const result = await createGetMigrationReportTool(owner, deps).handler({});

		expect(deps.syncService.syncIfStale).toHaveBeenCalledWith('v3');
		expect(deps.queryService.getLightReport).toHaveBeenCalledWith('v3', { kind: 'instance' });
		expect(deps.workflowSharingService.getSharedWorkflowIdsForScopes).not.toHaveBeenCalled();
		expect(result.structuredContent).toMatchObject({
			targetVersion: 'v3',
			currentVersion: '2.43.0',
			generatedAt: '2026-10-08T12:00:00.000Z',
			coverage: 'instance',
			reportUrl: `${BASE_URL}/settings/migration-report`,
			totalWorkflows: 12,
			affectedWorkflows: 4,
			workflowRules: [
				{
					ruleId: 'removed-node',
					impact: 'executionsFail',
					resolution: 'workflowEdit',
					openWorkflows: 3,
					wontFixWorkflows: 1,
				},
				{
					ruleId: 'embedded-chat',
					impact: 'capabilityRemoved',
					resolution: 'userConfirmation',
					openWorkflows: 1,
					wontFixWorkflows: 0,
				},
			],
			instanceRules: [
				{
					ruleId: 'docker-only',
					impact: 'upgradeBlocked',
					resolution: 'instanceConfiguration',
					issues: [{ title: 'npm install' }],
				},
				{ ruleId: 'task-runner-timeout', resolution: 'instanceConfiguration' },
			],
		});
	});

	it('reads only the workflows a member can edit, once each', async () => {
		const deps = makeDeps();
		deps.workflowSharingService.getSharedWorkflowIdsForScopes.mockResolvedValue([
			'wf-1',
			'wf-1',
			'wf-2',
		]);
		deps.queryService.getLightReport.mockResolvedValue({
			...lightReport(),
			report: { ...lightReport().report, instanceResults: [] },
		});

		const result = await createGetMigrationReportTool(member, deps).handler({});

		expect(deps.queryService.getLightReport).toHaveBeenCalledWith('v3', {
			kind: 'workflows',
			workflowIds: ['wf-1', 'wf-2'],
		});
		expect(result.structuredContent).toMatchObject({ coverage: 'editableWorkflows' });
	});

	it('names the target version in its description', () => {
		const tool = createGetMigrationReportTool(owner, makeDeps());

		expect(tool.config.description).toContain('n8n v3');
		expect(tool.config.annotations?.readOnlyHint).toBe(true);
	});
});

describe('get_migration_findings', () => {
	type RuleOutput = { ruleId: string; workflows: Record<string, unknown>[] } & Record<
		string,
		unknown
	>;
	type Output = { reportUrl: string; rules: RuleOutput[]; note?: string };

	const ruleDetail = (): BreakingChangeRuleDetailResult => ({
		...ruleFields('removed-node', 'executionsFail'),
		affectedWorkflows: [
			{
				id: 'wf-1',
				name: 'Accepted',
				active: true,
				numberOfExecutions: 4,
				lastUpdatedAt: new Date('2026-10-01T00:00:00.000Z'),
				lastExecutedAt: new Date('2026-10-02T00:00:00.000Z'),
				issues: [
					{ title: 'Removed', description: 'Gone', level: 'error', nodeId: 'n1', nodeName: 'Old' },
				],
				status: 'wont_fix',
			},
			{
				id: 'wf-2',
				name: 'Hidden from MCP',
				active: false,
				numberOfExecutions: 0,
				lastUpdatedAt: new Date('2026-10-01T00:00:00.000Z'),
				issues: [
					{
						title: 'Removed',
						description: 'Gone',
						level: 'error',
						nodeId: 'n2',
						nodeName: 'Secret',
					},
				],
				status: 'open',
			},
		],
	});

	it('asks for a ruleId or a workflowId', async () => {
		const result = await createGetMigrationFindingsTool(owner, makeDeps()).handler({});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			error: 'Pass a ruleId, a workflowId, or both.',
		});
	});

	it('refuses a rule that is not a workflow rule of the target version', async () => {
		const deps = makeDeps();
		deps.ruleRegistry.getRule.mockImplementation((id) =>
			id === 'old-rule'
				? workflowRule('old-rule', { version: 'v2' })
				: id === 'env-rule'
					? instanceRule('env-rule')
					: undefined,
		);
		const tool = createGetMigrationFindingsTool(owner, deps);

		for (const ruleId of ['missing', 'old-rule', 'env-rule']) {
			const result = await tool.handler({ ruleId });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining('get_migration_report'),
			});
		}
		expect(deps.queryService.getRuleFindings).not.toHaveBeenCalled();
	});

	describe('by rule', () => {
		it('lists open findings first and hides the issues of workflows not available in MCP', async () => {
			const deps = makeDeps();
			withRules(deps, workflowRule('removed-node'));
			deps.queryService.getRuleFindings.mockResolvedValue(ruleDetail());
			deps.workflowRepository.findByIds.mockResolvedValue([
				mcpWorkflow('wf-1', true),
				mcpWorkflow('wf-2', false),
			]);

			const result = await createGetMigrationFindingsTool(owner, deps).handler({
				ruleId: 'removed-node',
			});

			expect(deps.syncService.syncIfStale).toHaveBeenCalledWith('v3');
			expect(deps.queryService.getRuleFindings).toHaveBeenCalledWith('v3', 'removed-node', {
				kind: 'instance',
			});
			expect(deps.workflowRepository.findByIds).toHaveBeenCalledWith(['wf-2', 'wf-1'], {
				fields: ['settings'],
			});

			const output = result.structuredContent as Output;
			expect(output.reportUrl).toBe(`${BASE_URL}/settings/migration-report/removed-node`);
			expect(output.rules).toHaveLength(1);
			expect(output.rules[0]).toMatchObject({
				ruleId: 'removed-node',
				resolution: 'workflowEdit',
				totalWorkflows: 2,
			});
			expect(output.rules[0].workflows[0]).toEqual({
				workflowId: 'wf-2',
				name: 'Hidden from MCP',
				url: `${BASE_URL}/workflow/wf-2`,
				published: false,
				status: 'open',
				availableInMCP: false,
				numberOfExecutions: 0,
			});
			expect(output.rules[0].workflows[1]).toMatchObject({
				workflowId: 'wf-1',
				status: 'wont_fix',
				availableInMCP: true,
				published: true,
				lastExecutedAt: '2026-10-02T00:00:00.000Z',
				issues: [{ nodeId: 'n1', nodeName: 'Old' }],
			});
			expect(output.note).toContain('1 of these workflows are not available in MCP');
			expect(JSON.stringify(output)).not.toContain('Secret');
		});

		it('cuts the list at the limit and says so', async () => {
			const deps = makeDeps();
			withRules(deps, workflowRule('removed-node'));
			deps.queryService.getRuleFindings.mockResolvedValue(ruleDetail());
			deps.workflowRepository.findByIds.mockResolvedValue([mcpWorkflow('wf-2', true)]);

			const result = await createGetMigrationFindingsTool(owner, deps).handler({
				ruleId: 'removed-node',
				limit: 1,
			});

			const output = result.structuredContent as Output;
			expect(output.rules[0]).toMatchObject({ totalWorkflows: 2, truncated: true });
			expect(output.rules[0].workflows).toHaveLength(1);
		});
	});

	describe('by workflow', () => {
		it('re-checks the workflow, then lists every rule that flags it, most severe first', async () => {
			const deps = makeDeps();
			withRules(
				deps,
				workflowRule('removed-node'),
				workflowRule('embedded-chat', { resolution: 'userConfirmation' }),
			);
			deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mcpWorkflow('wf-1', true, 'published-version'),
			);
			deps.queryService.getWorkflowFindings.mockResolvedValue([
				workflowFinding('embedded-chat', 'behaviorChanges', 'open', 'Chat'),
				workflowFinding('removed-node', 'executionsFail', 'wont_fix'),
			]);

			const result = await createGetMigrationFindingsTool(owner, deps).handler({
				workflowId: 'wf-1',
			});

			expect(deps.workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				'wf-1',
				owner,
				['workflow:update'],
				{},
			);
			expect(deps.syncService.syncWorkflow).toHaveBeenCalledWith('wf-1');
			expect(deps.syncService.syncWorkflow).toHaveBeenCalledBefore(
				deps.queryService.getWorkflowFindings,
			);
			expect(deps.queryService.getWorkflowFindings).toHaveBeenCalledWith('v3', 'wf-1');

			const output = result.structuredContent as Output;
			expect(output.rules.map((rule) => rule.ruleId)).toEqual(['removed-node', 'embedded-chat']);
			expect(output.rules[1]).toMatchObject({
				resolution: 'userConfirmation',
				totalWorkflows: 1,
				workflows: [
					{
						workflowId: 'wf-1',
						name: 'Workflow wf-1',
						url: `${BASE_URL}/workflow/wf-1`,
						published: true,
						status: 'open',
						availableInMCP: true,
						issues: [{ nodeName: 'Chat' }],
					},
				],
			});
			expect(output.note).toBeUndefined();
		});

		it('narrows to one rule when both ids are given', async () => {
			const deps = makeDeps();
			withRules(deps, workflowRule('removed-node'), workflowRule('embedded-chat'));
			deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(mcpWorkflow('wf-1', true));
			deps.queryService.getWorkflowFindings.mockResolvedValue([
				workflowFinding('embedded-chat', 'behaviorChanges', 'open'),
				workflowFinding('removed-node', 'executionsFail', 'open'),
			]);

			const result = await createGetMigrationFindingsTool(owner, deps).handler({
				workflowId: 'wf-1',
				ruleId: 'removed-node',
			});

			const output = result.structuredContent as Output;
			expect(output.rules.map((rule) => rule.ruleId)).toEqual(['removed-node']);
		});

		it('says so when nothing is flagged on the workflow', async () => {
			const deps = makeDeps();
			deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(mcpWorkflow('wf-1', true));
			deps.queryService.getWorkflowFindings.mockResolvedValue([]);

			const result = await createGetMigrationFindingsTool(owner, deps).handler({
				workflowId: 'wf-1',
			});

			expect(result.structuredContent).toEqual({
				reportUrl: `${BASE_URL}/settings/migration-report`,
				rules: [],
				note: 'The v3 migration report flags nothing on this workflow.',
			});
		});

		it('refuses a workflow that is not available in MCP, without re-checking it', async () => {
			const deps = makeDeps();
			deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(mcpWorkflow('wf-1', false));

			const result = await createGetMigrationFindingsTool(owner, deps).handler({
				workflowId: 'wf-1',
			});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining('not available in MCP'),
			});
			expect(deps.syncService.syncWorkflow).not.toHaveBeenCalled();
			expect(deps.queryService.getWorkflowFindings).not.toHaveBeenCalled();
		});
	});
});

describe('readWorkflowMigrationFindings', () => {
	it('reports nothing for a workflow the report never flagged', async () => {
		const deps = makeDeps();
		deps.queryService.getWorkflowFindings.mockResolvedValue([]);
		deps.queryService.hasWorkflowFindings.mockResolvedValue(false);

		expect(await readWorkflowMigrationFindings(deps, 'wf-1')).toBeUndefined();
		expect(deps.syncService.syncWorkflow).toHaveBeenCalledWith('wf-1');
	});

	it('reports an empty list once every finding of the workflow is fixed', async () => {
		const deps = makeDeps();
		deps.queryService.getWorkflowFindings.mockResolvedValue([]);
		deps.queryService.hasWorkflowFindings.mockResolvedValue(true);

		expect(await readWorkflowMigrationFindings(deps, 'wf-1')).toEqual({
			targetVersion: 'v3',
			openFindings: [],
			wontFixFindings: 0,
		});
	});

	it('lists the open findings most severe first and counts the accepted ones', async () => {
		const deps = makeDeps();
		withRules(deps, workflowRule('embedded-chat', { resolution: 'userConfirmation' }));
		deps.queryService.getWorkflowFindings.mockResolvedValue([
			workflowFinding('embedded-chat', 'behaviorChanges', 'open', 'Chat'),
			workflowFinding('removed-node', 'executionsFail', 'open'),
			workflowFinding('always-output', 'behaviorChanges', 'wont_fix'),
		]);

		const result = await readWorkflowMigrationFindings(deps, 'wf-1');

		// The re-check has to land before the read, or a fix just saved still shows as open.
		expect(deps.syncService.syncWorkflow).toHaveBeenCalledBefore(
			deps.queryService.getWorkflowFindings,
		);
		expect(result).toEqual({
			targetVersion: 'v3',
			openFindings: [
				{
					ruleId: 'removed-node',
					title: 'removed-node title',
					impact: 'executionsFail',
					resolution: 'workflowEdit',
					issues: [expect.objectContaining({ nodeName: 'Old' })],
				},
				{
					ruleId: 'embedded-chat',
					title: 'embedded-chat title',
					impact: 'behaviorChanges',
					resolution: 'userConfirmation',
					issues: [expect.objectContaining({ nodeName: 'Chat' })],
				},
			],
			wontFixFindings: 1,
		});
	});
});

describe('migrate_workflow', () => {
	const migrationResult: WorkflowMigrationResult = {
		workflowId: 'wf-1',
		newVersionId: 'version-2',
		migratedNodeIds: ['n1'],
		unmapped: [],
		notes: ['Output now comes from a Code node'],
		republishable: false,
	};

	const readyToMigrate = () => {
		const deps = makeDeps();
		deps.migrationRegistry.has.mockReturnValue(true);
		deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(mcpWorkflow('wf-1', true));
		deps.collaborationService.broadcastWorkflowUpdate.mockResolvedValue(undefined);
		deps.migrationService.migrateWorkflow.mockResolvedValue(migrationResult);
		return deps;
	};

	it('refuses a rule without a built-in fix before touching the workflow', async () => {
		const deps = makeDeps();
		deps.migrationRegistry.has.mockReturnValue(false);

		const result = await createMigrateWorkflowTool(owner, deps).handler({
			ruleId: 'removed-node',
			workflowId: 'wf-1',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			success: false,
			error: expect.stringContaining('update_workflow'),
		});
		expect(deps.workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(deps.migrationService.migrateWorkflow).not.toHaveBeenCalled();
	});

	it('refuses a workflow that is not available in MCP', async () => {
		const deps = makeDeps();
		deps.migrationRegistry.has.mockReturnValue(true);
		deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(mcpWorkflow('wf-1', false));

		const result = await createMigrateWorkflowTool(owner, deps).handler({
			ruleId: 'ai-transform-deprecated',
			workflowId: 'wf-1',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			error: expect.stringContaining('not available in MCP'),
		});
		expect(deps.migrationService.migrateWorkflow).not.toHaveBeenCalled();
	});

	it('applies the fix as an MCP save and reports what is still open', async () => {
		const deps = readyToMigrate();
		deps.queryService.getWorkflowFindings.mockResolvedValue([]);
		deps.queryService.hasWorkflowFindings.mockResolvedValue(true);

		const result = await createMigrateWorkflowTool(owner, deps).handler({
			ruleId: 'ai-transform-deprecated',
			workflowId: 'wf-1',
		});

		expect(deps.workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
			'wf-1',
			owner,
			['workflow:update'],
			{},
		);
		expect(deps.collaborationService.ensureWorkflowEditable).toHaveBeenCalledWith('wf-1');
		expect(deps.migrationService.migrateWorkflow).toHaveBeenCalledWith(
			'ai-transform-deprecated',
			'wf-1',
			owner,
			{ source: 'n8n-mcp' },
		);
		expect(deps.collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
			'wf-1',
			owner.id,
		);
		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			success: true,
			...migrationResult,
			url: `${BASE_URL}/workflow/wf-1`,
			migrationFindings: { targetVersion: 'v3', openFindings: [], wontFixFindings: 0 },
		});
	});

	it('still reports the fix when the findings cannot be read', async () => {
		const deps = readyToMigrate();
		deps.queryService.getWorkflowFindings.mockRejectedValue(new Error('database gone'));

		const result = await createMigrateWorkflowTool(owner, deps).handler({
			ruleId: 'ai-transform-deprecated',
			workflowId: 'wf-1',
		});

		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			success: true,
			...migrationResult,
			url: `${BASE_URL}/workflow/wf-1`,
		});
		expect(deps.logger.warn).toHaveBeenCalled();
	});

	it('names the node the fix refused', async () => {
		const deps = readyToMigrate();
		deps.migrationService.migrateWorkflow.mockRejectedValue(
			new WorkflowMigrationNodeError('The prompt cannot be converted', {
				nodeId: 'n1',
				nodeName: 'AI Transform',
			}),
		);

		const result = await createMigrateWorkflowTool(owner, deps).handler({
			ruleId: 'ai-transform-deprecated',
			workflowId: 'wf-1',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			success: false,
			workflowId: 'wf-1',
			error: 'The prompt cannot be converted',
			nodeId: 'n1',
			nodeName: 'AI Transform',
		});
	});
});

describe('set_migration_finding_status', () => {
	it('sets the status of a finding on a workflow available in MCP', async () => {
		const deps = makeDeps();
		deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(mcpWorkflow('wf-1', true));

		const result = await createSetMigrationFindingStatusTool(owner, deps).handler({
			ruleId: 'always-output-data',
			workflowId: 'wf-1',
			status: 'wont_fix',
		});

		expect(deps.triageService.setStatus).toHaveBeenCalledWith(
			'always-output-data',
			'wf-1',
			'wont_fix',
		);
		expect(result.structuredContent).toEqual({
			success: true,
			ruleId: 'always-output-data',
			workflowId: 'wf-1',
			status: 'wont_fix',
		});
	});

	it('leaves the finding alone when the workflow is not available in MCP', async () => {
		const deps = makeDeps();
		deps.workflowFinderService.findWorkflowForUser.mockResolvedValue(mcpWorkflow('wf-1', false));

		const result = await createSetMigrationFindingStatusTool(owner, deps).handler({
			ruleId: 'always-output-data',
			workflowId: 'wf-1',
			status: 'wont_fix',
		});

		expect(result.isError).toBe(true);
		expect(deps.triageService.setStatus).not.toHaveBeenCalled();
	});
});
