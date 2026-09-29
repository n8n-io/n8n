import type {
	BreakingChangeReportResult,
	BreakingChangeVersion,
	BreakingChangeWorkflowRuleResult,
	MigrationFindingStatus,
} from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { TransactionRunner, WorkflowRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { RuleRegistry } from '../../breaking-changes.rule-registry.service';
import type { BreakingChangeService } from '../../breaking-changes.service';
import type { MigrationFinding } from '../../database/entities/migration-finding.entity';
import type { MigrationFindingSyncRepository } from '../../database/repositories/migration-finding-sync.repository';
import type { MigrationFindingRepository } from '../../database/repositories/migration-finding.repository';
import type { IBreakingChangeRule } from '../../types';
import type { MigrationFindingHit } from '../migration-finding-diff';
import {
	MigrationFindingSyncService,
	computeRuleSetFingerprint,
} from '../migration-finding-sync.service';

const TARGET_VERSION: BreakingChangeVersion = 'v2';

function detectionResult(hits: MigrationFindingHit[]): BreakingChangeReportResult {
	const workflowIdsByRule = new Map<string, string[]>();
	for (const hit of hits) {
		const ids = workflowIdsByRule.get(hit.ruleId) ?? [];
		ids.push(hit.workflowId);
		workflowIdsByRule.set(hit.ruleId, ids);
	}

	const workflowResults = [...workflowIdsByRule].map(
		([ruleId, workflowIds]) =>
			({
				ruleId,
				affectedWorkflows: workflowIds.map((id) => ({ id })),
			}) as BreakingChangeWorkflowRuleResult,
	);

	return {
		report: {
			generatedAt: new Date(),
			targetVersion: TARGET_VERSION,
			currentVersion: '2.0.0',
			instanceResults: [],
			workflowResults,
		},
		totalWorkflows: 0,
		shouldCache: false,
	};
}

function rules(...ids: string[]): IBreakingChangeRule[] {
	return ids.map((id) => ({ id }) as IBreakingChangeRule);
}

function findingRow(
	id: number,
	ruleId: string,
	workflowId: string,
	status: MigrationFindingStatus,
): MigrationFinding {
	return { id, targetVersion: TARGET_VERSION, ruleId, workflowId, status } as MigrationFinding;
}

describe('MigrationFindingSyncService', () => {
	let breakingChangeService: MockProxy<BreakingChangeService>;
	let ruleRegistry: MockProxy<RuleRegistry>;
	let workflowRepository: MockProxy<WorkflowRepository>;
	let findingRepository: MockProxy<MigrationFindingRepository>;
	let syncRepository: MockProxy<MigrationFindingSyncRepository>;
	let txRunner: MockProxy<TransactionRunner>;
	let instanceSettings: MockProxy<InstanceSettings>;
	let service: MigrationFindingSyncService;

	function givenWorkflows(count: number) {
		const allIds = Array.from({ length: count }, (_, index) => `wf-${String(index).padStart(4, '0')}`);
		workflowRepository.getIdsPage.mockImplementation(async ({ skip, take }) =>
			allIds.slice(skip, skip + take),
		);
		return allIds;
	}

	beforeEach(() => {
		breakingChangeService = mock<BreakingChangeService>();
		ruleRegistry = mock<RuleRegistry>();
		workflowRepository = mock<WorkflowRepository>();
		findingRepository = mock<MigrationFindingRepository>();
		syncRepository = mock<MigrationFindingSyncRepository>();
		txRunner = mock<TransactionRunner>();
		instanceSettings = mock<InstanceSettings>({ isLeader: true });

		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		ruleRegistry.getRules.mockReturnValue(rules('rule-a', 'rule-b'));
		findingRepository.listForWorkflows.mockResolvedValue([]);
		breakingChangeService.detect.mockResolvedValue(detectionResult([]));

		service = new MigrationFindingSyncService(
			breakingChangeService,
			ruleRegistry,
			workflowRepository,
			findingRepository,
			syncRepository,
			txRunner,
			instanceSettings,
			mockLogger(),
		);
	});

	it('inserts one open finding per hit on the first sync and records the sync', async () => {
		givenWorkflows(3);
		breakingChangeService.detect.mockResolvedValue(
			detectionResult([
				{ ruleId: 'rule-a', workflowId: 'wf-0000' },
				{ ruleId: 'rule-b', workflowId: 'wf-0000' },
				{ ruleId: 'rule-a', workflowId: 'wf-0002' },
			]),
		);

		await service.sync(TARGET_VERSION);

		expect(breakingChangeService.detect).toHaveBeenCalledWith(TARGET_VERSION);
		expect(findingRepository.insertMany).toHaveBeenCalledTimes(1);
		expect(findingRepository.insertMany).toHaveBeenCalledWith(
			[
				{ targetVersion: TARGET_VERSION, ruleId: 'rule-a', workflowId: 'wf-0000' },
				{ targetVersion: TARGET_VERSION, ruleId: 'rule-b', workflowId: 'wf-0000' },
				{ targetVersion: TARGET_VERSION, ruleId: 'rule-a', workflowId: 'wf-0002' },
			],
			expect.anything(),
		);
		expect(findingRepository.markFixedForIds).not.toHaveBeenCalled();
		expect(findingRepository.updateStatusForIds).not.toHaveBeenCalled();
		expect(syncRepository.upsertForVersion).toHaveBeenCalledWith(
			{
				targetVersion: TARGET_VERSION,
				syncedAt: expect.any(Date),
				ruleSetFingerprint: computeRuleSetFingerprint(['rule-a', 'rule-b']),
			},
			expect.anything(),
		);
	});

	it('writes no finding changes when a second sync reports the same hits', async () => {
		givenWorkflows(2);
		breakingChangeService.detect.mockResolvedValue(
			detectionResult([{ ruleId: 'rule-a', workflowId: 'wf-0001' }]),
		);
		findingRepository.listForWorkflows.mockResolvedValue([
			findingRow(1, 'rule-a', 'wf-0001', 'open'),
		]);

		await service.sync(TARGET_VERSION);

		expect(findingRepository.insertMany).not.toHaveBeenCalled();
		expect(findingRepository.markFixedForIds).not.toHaveBeenCalled();
		expect(findingRepository.updateStatusForIds).not.toHaveBeenCalled();
		expect(syncRepository.upsertForVersion).toHaveBeenCalledTimes(1);
	});

	it('marks a vanished hit fixed and reopens a returning hit', async () => {
		givenWorkflows(2);
		breakingChangeService.detect.mockResolvedValue(
			detectionResult([{ ruleId: 'rule-b', workflowId: 'wf-0001' }]),
		);
		findingRepository.listForWorkflows.mockResolvedValue([
			findingRow(1, 'rule-a', 'wf-0000', 'open'),
			findingRow(2, 'rule-b', 'wf-0001', 'fixed'),
		]);

		await service.sync(TARGET_VERSION);

		expect(findingRepository.markFixedForIds).toHaveBeenCalledWith([1], expect.anything());
		expect(findingRepository.updateStatusForIds).toHaveBeenCalledWith(
			[2],
			'open',
			undefined,
			expect.anything(),
		);
		expect(findingRepository.insertMany).not.toHaveBeenCalled();
	});

	it('runs one transaction per batch of 100 workflows', async () => {
		givenWorkflows(250);

		await service.sync(TARGET_VERSION);

		expect(txRunner.run).toHaveBeenCalledTimes(3);
		expect(findingRepository.listForWorkflows).toHaveBeenCalledTimes(3);
		expect(findingRepository.listForWorkflows.mock.calls[0][1]).toHaveLength(100);
		expect(findingRepository.listForWorkflows.mock.calls[2][1]).toHaveLength(50);
		expect(syncRepository.upsertForVersion).toHaveBeenCalledTimes(1);
	});

	it('does not write the sync record before every batch is done', async () => {
		givenWorkflows(150);
		const order: string[] = [];
		txRunner.run.mockImplementation(async (ctx, fn) => {
			order.push('batch');
			return await fn(ctx);
		});
		syncRepository.upsertForVersion.mockImplementation(async () => {
			order.push('sync-record');
		});

		await service.sync(TARGET_VERSION);

		expect(order).toEqual(['batch', 'batch', 'sync-record']);
	});

	describe('rule set fingerprint', () => {
		it('is the same regardless of rule order', () => {
			expect(computeRuleSetFingerprint(['rule-b', 'rule-a'])).toBe(
				computeRuleSetFingerprint(['rule-a', 'rule-b']),
			);
		});

		it('changes when a rule is added or removed', () => {
			const base = computeRuleSetFingerprint(['rule-a', 'rule-b']);

			expect(computeRuleSetFingerprint(['rule-a', 'rule-b', 'rule-c'])).not.toBe(base);
			expect(computeRuleSetFingerprint(['rule-a'])).not.toBe(base);
		});

		it('is taken from the rules registered for the target version', async () => {
			givenWorkflows(0);
			ruleRegistry.getRules.mockReturnValue(rules('rule-z', 'rule-y'));

			await service.sync(TARGET_VERSION);

			expect(ruleRegistry.getRules).toHaveBeenCalledWith(TARGET_VERSION);
			expect(syncRepository.upsertForVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					ruleSetFingerprint: computeRuleSetFingerprint(['rule-y', 'rule-z']),
				}),
				expect.anything(),
			);
		});
	});

	it('computes and writes nothing when the instance is not the leader', async () => {
		instanceSettings = mock<InstanceSettings>({ isLeader: false });
		service = new MigrationFindingSyncService(
			breakingChangeService,
			ruleRegistry,
			workflowRepository,
			findingRepository,
			syncRepository,
			txRunner,
			instanceSettings,
			mockLogger(),
		);
		givenWorkflows(3);

		await service.sync(TARGET_VERSION);

		expect(breakingChangeService.detect).not.toHaveBeenCalled();
		expect(workflowRepository.getIdsPage).not.toHaveBeenCalled();
		expect(txRunner.run).not.toHaveBeenCalled();
		expect(syncRepository.upsertForVersion).not.toHaveBeenCalled();
	});

	it('shares one run between two concurrent calls for the same version', async () => {
		givenWorkflows(3);

		await Promise.all([service.sync(TARGET_VERSION), service.sync(TARGET_VERSION)]);

		expect(breakingChangeService.detect).toHaveBeenCalledTimes(1);
		expect(syncRepository.upsertForVersion).toHaveBeenCalledTimes(1);
	});

	it('starts a new run once the previous one has finished', async () => {
		givenWorkflows(3);

		await service.sync(TARGET_VERSION);
		await service.sync(TARGET_VERSION);

		expect(breakingChangeService.detect).toHaveBeenCalledTimes(2);
	});
});
