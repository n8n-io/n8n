import type {
	BreakingChangeVersion,
	BreakingChangeWorkflowRuleResult,
	MigrationFindingStatus,
} from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { TransactionRunner, WorkflowRepository } from '@n8n/db';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { RuleRegistry } from '../../breaking-changes.rule-registry.service';
import type {
	BreakingChangeDetectionResult,
	BreakingChangeService,
} from '../../breaking-changes.service';
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

function detectionResult(
	hits: MigrationFindingHit[],
	failedChecks: MigrationFindingHit[] = [],
): BreakingChangeDetectionResult {
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
		failedChecks,
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
	let errorReporter: MockProxy<ErrorReporter>;
	let isLeader: boolean;
	let service: MigrationFindingSyncService;

	// A getter, so a test can take leadership away while a sync is running.
	const instanceSettings = {
		get isLeader() {
			return isLeader;
		},
	} as InstanceSettings;

	/** Feeds `getIdsAfter` from a mutable list, so a test can remove a workflow between pages. */
	function givenWorkflows(count: number) {
		const allIds = Array.from(
			{ length: count },
			(_, index) => `wf-${String(index).padStart(4, '0')}`,
		);
		workflowRepository.getIdsAfter.mockImplementation(async (afterId, take) =>
			allIds.filter((id) => afterId === undefined || id > afterId).slice(0, take),
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
		errorReporter = mock<ErrorReporter>();
		isLeader = true;

		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		// By default every paged id still exists when the batch re-checks it.
		workflowRepository.findExistingIds.mockImplementation(async (ids) => ids);
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
			errorReporter,
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

	it('leaves the finding of a rule check that threw untouched', async () => {
		givenWorkflows(3);
		breakingChangeService.detect.mockResolvedValue(
			detectionResult([], [{ ruleId: 'rule-a', workflowId: 'wf-0001' }]),
		);
		findingRepository.listForWorkflows.mockResolvedValue([
			findingRow(1, 'rule-a', 'wf-0001', 'open'),
			findingRow(2, 'rule-a', 'wf-0002', 'open'),
		]);

		await service.sync(TARGET_VERSION);

		// The workflow itself is still visited; only the failed pair is left alone.
		expect(findingRepository.listForWorkflows).toHaveBeenCalledWith(
			TARGET_VERSION,
			['wf-0000', 'wf-0001', 'wf-0002'],
			expect.anything(),
		);
		expect(findingRepository.markFixedForIds).toHaveBeenCalledWith([2], expect.anything());
		expect(findingRepository.insertMany).not.toHaveBeenCalled();
	});

	it('still syncs the other rules of a workflow when one rule check threw', async () => {
		givenWorkflows(1);
		breakingChangeService.detect.mockResolvedValue(
			detectionResult(
				[{ ruleId: 'rule-b', workflowId: 'wf-0000' }],
				[{ ruleId: 'rule-a', workflowId: 'wf-0000' }],
			),
		);
		findingRepository.listForWorkflows.mockResolvedValue([
			findingRow(1, 'rule-a', 'wf-0000', 'open'),
			findingRow(2, 'rule-c', 'wf-0000', 'open'),
		]);

		await service.sync(TARGET_VERSION);

		expect(findingRepository.insertMany).toHaveBeenCalledWith(
			[{ targetVersion: TARGET_VERSION, ruleId: 'rule-b', workflowId: 'wf-0000' }],
			expect.anything(),
		);
		expect(findingRepository.markFixedForIds).toHaveBeenCalledWith([2], expect.anything());
		expect(syncRepository.upsertForVersion).toHaveBeenCalledTimes(1);
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

	it('still visits every remaining workflow when one is deleted between pages', async () => {
		const allIds = givenWorkflows(150);
		txRunner.run.mockImplementationOnce(async (ctx, fn) => {
			const result = await fn(ctx);
			allIds.splice(allIds.indexOf('wf-0000'), 1);
			return result;
		});

		await service.sync(TARGET_VERSION);

		const visited = findingRepository.listForWorkflows.mock.calls.flatMap(([, ids]) => ids);
		expect(visited).toHaveLength(150);
		expect(new Set(visited).size).toBe(150);
	});

	it('ignores a workflow deleted after its page was read, so no finding targets it', async () => {
		givenWorkflows(3);
		breakingChangeService.detect.mockResolvedValue(
			detectionResult([
				{ ruleId: 'rule-a', workflowId: 'wf-0000' },
				{ ruleId: 'rule-a', workflowId: 'wf-0001' },
			]),
		);
		// wf-0001 is gone by the time the batch transaction re-checks the page.
		workflowRepository.findExistingIds.mockResolvedValue(['wf-0000', 'wf-0002']);

		await service.sync(TARGET_VERSION);

		expect(workflowRepository.findExistingIds).toHaveBeenCalledWith(
			['wf-0000', 'wf-0001', 'wf-0002'],
			expect.anything(),
		);
		expect(findingRepository.listForWorkflows).toHaveBeenCalledWith(
			TARGET_VERSION,
			['wf-0000', 'wf-0002'],
			expect.anything(),
		);
		expect(findingRepository.insertMany).toHaveBeenCalledWith(
			[{ targetVersion: TARGET_VERSION, ruleId: 'rule-a', workflowId: 'wf-0000' }],
			expect.anything(),
		);
		expect(syncRepository.upsertForVersion).toHaveBeenCalledTimes(1);
	});

	it('continues with the next batch when one batch fails, and records no sync', async () => {
		givenWorkflows(250);
		const failure = new Error('batch failed');
		txRunner.run
			.mockImplementationOnce(async (ctx, fn) => await fn(ctx))
			.mockImplementationOnce(async () => {
				throw failure;
			});

		await service.sync(TARGET_VERSION);

		expect(txRunner.run).toHaveBeenCalledTimes(3);
		expect(findingRepository.listForWorkflows).toHaveBeenCalledTimes(2);
		expect(errorReporter.error).toHaveBeenCalledWith(failure, {
			extra: { targetVersion: TARGET_VERSION, batchStart: 'wf-0100' },
		});
		expect(syncRepository.upsertForVersion).not.toHaveBeenCalled();
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
		isLeader = false;
		givenWorkflows(3);

		await service.sync(TARGET_VERSION);

		expect(breakingChangeService.detect).not.toHaveBeenCalled();
		expect(workflowRepository.getIdsAfter).not.toHaveBeenCalled();
		expect(txRunner.run).not.toHaveBeenCalled();
		expect(syncRepository.upsertForVersion).not.toHaveBeenCalled();
	});

	it('stops writing and records no sync when leadership is lost between batches', async () => {
		givenWorkflows(250);
		txRunner.run.mockImplementation(async (ctx, fn) => {
			const result = await fn(ctx);
			isLeader = false;
			return result;
		});

		await service.sync(TARGET_VERSION);

		expect(txRunner.run).toHaveBeenCalledTimes(1);
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
