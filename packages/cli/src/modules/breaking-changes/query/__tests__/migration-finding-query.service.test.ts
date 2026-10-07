import type {
	BreakingChangeInstanceRuleResult,
	BreakingChangeVersion,
	BreakingChangeWorkflowIssue,
	BreakingChangeWorkflowRuleResult,
	MigrationFindingTriageStatus,
} from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type {
	User,
	UserRepository,
	WorkflowEntity,
	WorkflowRepository,
	WorkflowStatistics,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import type { ErrorReporter } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { MigrationRegistry } from '../../breaking-changes.migration-registry.service';
import type { RuleRegistry } from '../../breaking-changes.rule-registry.service';
import type { BreakingChangeService } from '../../breaking-changes.service';
import type { MigrationFindingSync } from '../../database/entities/migration-finding-sync.entity';
import type { MigrationWorkflowOwner } from '../../database/entities/migration-workflow-owner.entity';
import type { MigrationFindingSyncRepository } from '../../database/repositories/migration-finding-sync.repository';
import type {
	MigrationFindingRepository,
	TriageableMigrationFinding,
} from '../../database/repositories/migration-finding.repository';
import type { MigrationWorkflowOwnerRepository } from '../../database/repositories/migration-workflow-owner.repository';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeBatchWorkflowRule,
	IBreakingChangeInstanceRule,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';
import { MigrationFindingQueryService } from '../migration-finding-query.service';

const TARGET_VERSION: BreakingChangeVersion = 'v3';
const UPDATED_AT = new Date('2026-05-01T10:00:00.000Z');

function metadata(id: string): BreakingChangeRuleMetadata {
	return {
		version: TARGET_VERSION,
		title: `${id} title`,
		description: `${id} description`,
		category: BreakingChangeCategory.workflow,
		impact: 'executionsFail',
		documentationUrl: `https://docs.n8n.io/${id}`,
	};
}

/** A workflow rule that flags every node of `nodeType`. */
function workflowRule(id: string, nodeType: string): IBreakingChangeWorkflowRule {
	return {
		id,
		getMetadata: () => metadata(id),
		getRecommendations: async () => [{ action: `Fix ${id}`, description: `How to fix ${id}` }],
		detectWorkflow: async (_workflow, nodesByType): Promise<WorkflowDetectionReport> => {
			const nodes = nodesByType.get(nodeType) ?? [];
			return { isAffected: nodes.length > 0, issues: nodes.map(issueFor) };
		},
	};
}

function issueFor(node: INode): BreakingChangeWorkflowIssue {
	return {
		title: `${node.name} is affected`,
		description: 'The node must change',
		level: 'warning',
		nodeId: node.id,
		nodeName: node.name,
	};
}

/** A batch rule: it needs every workflow before it can report, so it has no per-workflow check. */
function batchRule(id: string): IBreakingChangeBatchWorkflowRule {
	return {
		id,
		getMetadata: () => metadata(id),
		getRecommendations: async () => [],
		collectWorkflowData: async () => {},
		produceReport: async () => ({ affectedWorkflows: [] }),
		reset: () => {},
	};
}

function instanceRule(id: string): IBreakingChangeInstanceRule {
	return {
		id,
		getMetadata: () => metadata(id),
		detect: async () => ({ isAffected: true, instanceIssues: [], recommendations: [] }),
	};
}

function triageableFinding(
	id: number,
	ruleId: string,
	workflow: TriageableMigrationFinding['workflow'],
	status: MigrationFindingTriageStatus = 'open',
): TriageableMigrationFinding {
	return { id, ruleId, workflowId: workflow.id, status, workflow };
}

function workflowWithNodes(id: string, nodeTypes: string[]): WorkflowEntity {
	const nodes: INode[] = nodeTypes.map((type, index) => ({
		id: `${id}-node-${index}`,
		name: `${type} ${index}`,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	}));
	return { id, nodes } as WorkflowEntity;
}

function statistic(workflowId: string, count: number, latestEvent: Date): WorkflowStatistics {
	return { workflowId, count, latestEvent } as WorkflowStatistics;
}

describe('MigrationFindingQueryService', () => {
	const ruleA = workflowRule('rule-a', 'n8n-nodes-base.a');
	const ruleB = workflowRule('rule-b', 'n8n-nodes-base.b');
	const instance = instanceRule('instance-rule');
	const allRules = [ruleA, instance, ruleB];

	let ruleRegistry: MockProxy<RuleRegistry>;
	let migrationRegistry: MockProxy<MigrationRegistry>;
	let breakingChangeService: MockProxy<BreakingChangeService>;
	let workflowRepository: MockProxy<WorkflowRepository>;
	let workflowStatisticsRepository: MockProxy<WorkflowStatisticsRepository>;
	let findingRepository: MockProxy<MigrationFindingRepository>;
	let syncRepository: MockProxy<MigrationFindingSyncRepository>;
	let ownerRepository: MockProxy<MigrationWorkflowOwnerRepository>;
	let userRepository: MockProxy<UserRepository>;
	let errorReporter: MockProxy<ErrorReporter>;
	let service: MigrationFindingQueryService;

	beforeEach(() => {
		ruleRegistry = mock<RuleRegistry>();
		migrationRegistry = mock<MigrationRegistry>();
		breakingChangeService = mock<BreakingChangeService>();
		workflowRepository = mock<WorkflowRepository>();
		workflowStatisticsRepository = mock<WorkflowStatisticsRepository>();
		findingRepository = mock<MigrationFindingRepository>();
		syncRepository = mock<MigrationFindingSyncRepository>();
		ownerRepository = mock<MigrationWorkflowOwnerRepository>();
		userRepository = mock<UserRepository>();
		errorReporter = mock<ErrorReporter>();

		ruleRegistry.getRules.mockReturnValue(allRules);
		ruleRegistry.getRule.mockImplementation((id) => allRules.find((rule) => rule.id === id));
		migrationRegistry.has.mockImplementation((id) => id === 'rule-b');
		breakingChangeService.getAllInstanceRulesResults.mockResolvedValue([]);
		workflowRepository.count.mockResolvedValue(0);
		workflowRepository.findByIds.mockResolvedValue([]);
		workflowStatisticsRepository.findByWorkflowIds.mockResolvedValue([]);
		findingRepository.countOpenByRule.mockResolvedValue([]);
		findingRepository.listRuleIdsWithWontFix.mockResolvedValue([]);
		findingRepository.countDistinctOpenWorkflows.mockResolvedValue(0);
		findingRepository.listTriageableForRule.mockResolvedValue([]);
		syncRepository.getForVersion.mockResolvedValue(null);
		ownerRepository.findByWorkflowIds.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([]);

		service = new MigrationFindingQueryService(
			ruleRegistry,
			migrationRegistry,
			breakingChangeService,
			workflowRepository,
			workflowStatisticsRepository,
			findingRepository,
			syncRepository,
			ownerRepository,
			userRepository,
			mockLogger(),
			errorReporter,
		);
	});

	describe('getLightReport', () => {
		it('lists each workflow rule with open findings, with its metadata and count from the table', async () => {
			findingRepository.countOpenByRule.mockResolvedValue([{ ruleId: 'rule-a', count: 3 }]);
			workflowRepository.count.mockResolvedValue(10);

			const result = await service.getLightReport(TARGET_VERSION);

			expect(ruleRegistry.getRules).toHaveBeenCalledWith(TARGET_VERSION);
			expect(findingRepository.countOpenByRule).toHaveBeenCalledWith(
				TARGET_VERSION,
				expect.anything(),
			);
			expect(result.report.workflowResults).toEqual([
				{
					ruleId: 'rule-a',
					ruleTitle: 'rule-a title',
					ruleDescription: 'rule-a description',
					ruleImpact: 'executionsFail',
					ruleDocumentationUrl: 'https://docs.n8n.io/rule-a',
					recommendations: [{ action: 'Fix rule-a', description: 'How to fix rule-a' }],
					migratable: false,
					nbAffectedWorkflows: 3,
				},
			]);
			// rule-b has no open findings, so it is left out, as in today's scan.
			expect(result.report.targetVersion).toBe(TARGET_VERSION);
			expect(result.totalWorkflows).toBe(10);
			expect(result.shouldCache).toBe(false);
		});

		it('lists a rule with only wont_fix findings with a count of zero', async () => {
			findingRepository.countOpenByRule.mockResolvedValue([{ ruleId: 'rule-a', count: 3 }]);
			findingRepository.listRuleIdsWithWontFix.mockResolvedValue(['rule-a', 'rule-b']);

			const result = await service.getLightReport(TARGET_VERSION);

			expect(findingRepository.listRuleIdsWithWontFix).toHaveBeenCalledWith(
				TARGET_VERSION,
				expect.anything(),
			);
			expect(
				result.report.workflowResults.map(({ ruleId, nbAffectedWorkflows }) => ({
					ruleId,
					nbAffectedWorkflows,
				})),
			).toEqual([
				{ ruleId: 'rule-a', nbAffectedWorkflows: 3 },
				{ ruleId: 'rule-b', nbAffectedWorkflows: 0 },
			]);
		});

		it('counts each affected workflow once across rules', async () => {
			findingRepository.countOpenByRule.mockResolvedValue([
				{ ruleId: 'rule-a', count: 3 },
				{ ruleId: 'rule-b', count: 2 },
			]);
			findingRepository.countDistinctOpenWorkflows.mockResolvedValue(4);

			const result = await service.getLightReport(TARGET_VERSION);

			expect(findingRepository.countDistinctOpenWorkflows).toHaveBeenCalledWith(
				TARGET_VERSION,
				expect.anything(),
			);
			expect(result.totalAffectedWorkflows).toBe(4);
		});

		it('computes instance results live through the detection service', async () => {
			const instanceResult = mock<BreakingChangeInstanceRuleResult>({ ruleId: 'instance-rule' });
			breakingChangeService.getAllInstanceRulesResults.mockResolvedValue([instanceResult]);

			const result = await service.getLightReport(TARGET_VERSION);

			expect(breakingChangeService.getAllInstanceRulesResults).toHaveBeenCalledWith([instance]);
			expect(result.report.instanceResults).toEqual([instanceResult]);
			expect(breakingChangeService.detect).not.toHaveBeenCalled();
		});

		it('reports the last sync time as generatedAt', async () => {
			const syncedAt = new Date('2026-04-02T08:00:00.000Z');
			syncRepository.getForVersion.mockResolvedValue({
				targetVersion: TARGET_VERSION,
				syncedAt,
				ruleSetFingerprint: 'fp',
			} as MigrationFindingSync);

			const result = await service.getLightReport(TARGET_VERSION);

			expect(syncRepository.getForVersion).toHaveBeenCalledWith(TARGET_VERSION, expect.anything());
			expect(result.report.generatedAt).toEqual(syncedAt);
		});

		it('falls back to the current time as generatedAt when no sync ran yet', async () => {
			const now = new Date('2026-06-01T12:00:00.000Z');
			vi.useFakeTimers({ now });
			try {
				const result = await service.getLightReport(TARGET_VERSION);

				expect(result.report.generatedAt).toEqual(now);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('getRuleFindings', () => {
		it('returns one workflow per open or wont_fix finding with its status, statistics and the issues of that rule', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([
				triageableFinding(1, 'rule-a', {
					id: 'wf-1',
					name: 'First',
					activeVersionId: 'version-1',
					updatedAt: UPDATED_AT,
				}),
				triageableFinding(
					2,
					'rule-a',
					{
						id: 'wf-2',
						name: 'Second',
						activeVersionId: null,
						updatedAt: UPDATED_AT,
					},
					'wont_fix',
				),
			]);
			workflowRepository.findByIds.mockResolvedValue([
				workflowWithNodes('wf-1', ['n8n-nodes-base.a', 'n8n-nodes-base.other', 'n8n-nodes-base.a']),
				workflowWithNodes('wf-2', ['n8n-nodes-base.a']),
			]);
			workflowStatisticsRepository.findByWorkflowIds.mockResolvedValue([
				statistic('wf-1', 5, new Date('2026-03-01T00:00:00.000Z')),
				statistic('wf-1', 7, new Date('2026-04-01T00:00:00.000Z')),
			]);

			const result = await service.getRuleFindings(TARGET_VERSION, 'rule-a');

			expect(findingRepository.listTriageableForRule).toHaveBeenCalledWith(
				TARGET_VERSION,
				'rule-a',
				expect.anything(),
			);
			expect(workflowRepository.findByIds).toHaveBeenCalledWith(
				['wf-1', 'wf-2'],
				expect.anything(),
			);
			expect(workflowStatisticsRepository.findByWorkflowIds).toHaveBeenCalledWith(['wf-1', 'wf-2']);
			expect(result).toMatchObject({
				ruleId: 'rule-a',
				ruleTitle: 'rule-a title',
				ruleDescription: 'rule-a description',
				ruleImpact: 'executionsFail',
				ruleDocumentationUrl: 'https://docs.n8n.io/rule-a',
				recommendations: [{ action: 'Fix rule-a', description: 'How to fix rule-a' }],
				migratable: false,
			});
			expect(result.affectedWorkflows).toEqual([
				{
					id: 'wf-1',
					name: 'First',
					active: true,
					numberOfExecutions: 12,
					lastExecutedAt: new Date('2026-04-01T00:00:00.000Z'),
					lastUpdatedAt: UPDATED_AT,
					issues: [
						expect.objectContaining({ nodeId: 'wf-1-node-0', nodeName: 'n8n-nodes-base.a 0' }),
						expect.objectContaining({ nodeId: 'wf-1-node-2', nodeName: 'n8n-nodes-base.a 2' }),
					],
					status: 'open',
				},
				{
					id: 'wf-2',
					name: 'Second',
					active: false,
					numberOfExecutions: 0,
					lastExecutedAt: undefined,
					lastUpdatedAt: UPDATED_AT,
					issues: [expect.objectContaining({ nodeId: 'wf-2-node-0' })],
					status: 'wont_fix',
				},
			]);
			expect(breakingChangeService.detect).not.toHaveBeenCalled();
		});

		it('adds the owner of each workflow that has one, with the user details and the source', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([
				triageableFinding(1, 'rule-a', {
					id: 'wf-1',
					name: 'First',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
				triageableFinding(2, 'rule-a', {
					id: 'wf-2',
					name: 'Second',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
			]);
			ownerRepository.findByWorkflowIds.mockResolvedValue([
				{ workflowId: 'wf-1', userId: 'user-1', source: 'suggested' } as MigrationWorkflowOwner,
			]);
			userRepository.findManyByIds.mockResolvedValue([
				{ id: 'user-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' } as User,
			]);

			const result = await service.getRuleFindings(TARGET_VERSION, 'rule-a');

			expect(ownerRepository.findByWorkflowIds).toHaveBeenCalledWith(
				['wf-1', 'wf-2'],
				expect.anything(),
			);
			expect(userRepository.findManyByIds).toHaveBeenCalledWith(['user-1']);
			expect(result.affectedWorkflows[0].owner).toEqual({
				id: 'user-1',
				firstName: 'Ada',
				lastName: 'Lovelace',
				email: 'ada@example.com',
				source: 'suggested',
			});
			expect(result.affectedWorkflows[1].owner).toBeUndefined();
		});

		it('lists a workflow without an owner when its owner row has no user any more', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([
				triageableFinding(1, 'rule-a', {
					id: 'wf-1',
					name: 'First',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
			]);
			ownerRepository.findByWorkflowIds.mockResolvedValue([
				{ workflowId: 'wf-1', userId: null, source: 'assigned' } as MigrationWorkflowOwner,
			]);

			const result = await service.getRuleFindings(TARGET_VERSION, 'rule-a');

			expect(userRepository.findManyByIds).not.toHaveBeenCalled();
			expect(result.affectedWorkflows[0].owner).toBeUndefined();
		});

		it('lists a finding whose rule no longer fires on the current workflow with no issues', async () => {
			findingRepository.listTriageableForRule.mockResolvedValue([
				triageableFinding(1, 'rule-a', {
					id: 'wf-1',
					name: 'Already fixed',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
			]);
			workflowRepository.findByIds.mockResolvedValue([
				workflowWithNodes('wf-1', ['n8n-nodes-base.other']),
			]);

			const result = await service.getRuleFindings(TARGET_VERSION, 'rule-a');

			expect(result.affectedWorkflows).toEqual([
				expect.objectContaining({ id: 'wf-1', name: 'Already fixed', issues: [] }),
			]);
		});

		it('lists a workflow with no issues and reports the error when the rule throws for it', async () => {
			const failure = new Error('rule exploded');
			const throwingRule: IBreakingChangeWorkflowRule = {
				...ruleA,
				detectWorkflow: async () => {
					throw failure;
				},
			};
			ruleRegistry.getRule.mockReturnValue(throwingRule);
			findingRepository.listTriageableForRule.mockResolvedValue([
				triageableFinding(1, 'rule-a', {
					id: 'wf-1',
					name: 'Broken',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
			]);
			workflowRepository.findByIds.mockResolvedValue([
				workflowWithNodes('wf-1', ['n8n-nodes-base.a']),
			]);

			const result = await service.getRuleFindings(TARGET_VERSION, 'rule-a');

			expect(result.affectedWorkflows).toEqual([
				expect.objectContaining({ id: 'wf-1', issues: [] }),
			]);
			expect(errorReporter.error).toHaveBeenCalledWith(
				failure,
				expect.objectContaining({ extra: { ruleId: 'rule-a', workflowId: 'wf-1' } }),
			);
		});

		it('takes the issues of a batch rule from a scan of that rule alone, keyed by workflow', async () => {
			const rule = batchRule('batch-rule');
			ruleRegistry.getRule.mockReturnValue(rule);
			findingRepository.listTriageableForRule.mockResolvedValue([
				triageableFinding(1, 'batch-rule', {
					id: 'wf-1',
					name: 'Still affected',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
				triageableFinding(2, 'batch-rule', {
					id: 'wf-2',
					name: 'No longer in the scan',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
			]);
			const issue: BreakingChangeWorkflowIssue = {
				title: 'Calls a waiting sub-workflow',
				description: 'The call changes behaviour',
				level: 'warning',
				nodeId: 'wf-1-node-0',
			};
			breakingChangeService.detectRule.mockResolvedValue({
				ruleId: 'batch-rule',
				affectedWorkflows: [{ id: 'wf-1', issues: [issue] }],
			} as BreakingChangeWorkflowRuleResult);

			const result = await service.getRuleFindings(TARGET_VERSION, 'batch-rule');

			expect(breakingChangeService.detectRule).toHaveBeenCalledTimes(1);
			expect(breakingChangeService.detectRule).toHaveBeenCalledWith(TARGET_VERSION, rule);
			expect(breakingChangeService.detect).not.toHaveBeenCalled();
			expect(result.affectedWorkflows).toEqual([
				expect.objectContaining({ id: 'wf-1', issues: [issue] }),
				expect.objectContaining({ id: 'wf-2', issues: [] }),
			]);
		});

		it('lists every finding of a batch rule without issues when the rule now affects nothing', async () => {
			ruleRegistry.getRule.mockReturnValue(batchRule('batch-rule'));
			findingRepository.listTriageableForRule.mockResolvedValue([
				triageableFinding(1, 'batch-rule', {
					id: 'wf-1',
					name: 'Fixed since the sync',
					activeVersionId: null,
					updatedAt: UPDATED_AT,
				}),
			]);
			breakingChangeService.detectRule.mockResolvedValue(undefined);

			const result = await service.getRuleFindings(TARGET_VERSION, 'batch-rule');

			expect(result.affectedWorkflows).toEqual([
				expect.objectContaining({ id: 'wf-1', issues: [] }),
			]);
		});

		it('rejects an unknown rule id with a not-found error', async () => {
			await expect(service.getRuleFindings(TARGET_VERSION, 'missing-rule')).rejects.toThrow(
				NotFoundError,
			);
			expect(findingRepository.listTriageableForRule).not.toHaveBeenCalled();
		});

		it('rejects an instance rule id with a not-found error', async () => {
			await expect(service.getRuleFindings(TARGET_VERSION, 'instance-rule')).rejects.toThrow(
				NotFoundError,
			);
		});
	});
});
