import type { LlmUsageRecord } from '@n8n/ai-utilities/llm-usage';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { LlmUsageCollector } from '../llm-usage-collector.service';
import type { LlmUsageRepository } from '../llm-usage.repository';
import type { PriceCatalogService } from '../price-catalog.service';
import type { LlmBudgetSpendService } from '../llm-budget-spend.service';
import type { WorkflowPublisherCache } from '../workflow-publisher-cache';

let sequence = 0;
const record = (): LlmUsageRecord => ({
	id: `call-${++sequence}`,
	provider: 'openai',
	model: 'gpt-4o-mini',
	inputTokens: 100,
	outputTokens: 10,
	startedAt: new Date(1_000),
	finishedAt: new Date(1_250),
	context: { callerType: 'node', workflowId: 'wf-1', projectId: 'project-1' },
});

describe('LlmUsageCollector', () => {
	const repository = mock<LlmUsageRepository>();
	const catalog = mock<PriceCatalogService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const instanceSettings = mock<InstanceSettings>({ isLeader: true });
	const publishers = mock<WorkflowPublisherCache>();
	const budgetSpend = mock<LlmBudgetSpendService>();
	let collector: LlmUsageCollector;

	beforeEach(() => {
		vi.useFakeTimers();
		repository.insertIgnoringDuplicates.mockReset().mockResolvedValue(undefined);
		catalog.lookup.mockReturnValue({ input: 0.01, output: 0.02 });
		collector = new LlmUsageCollector(
			repository,
			catalog,
			instanceSettings,
			logger,
			publishers,
			budgetSpend,
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('prices the buffered records and writes them on flush', async () => {
		const call = record();
		collector.write(call);

		await collector.flush();

		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledWith([
			expect.objectContaining({
				callId: call.id,
				workflowId: 'wf-1',
				projectId: 'project-1',
				callerType: 'node',
				durationMs: 250,
				estimatedCostUsd: 1.2,
				priced: true,
			}),
		]);
	});

	it('stores the credential ID, or who manages the credential', async () => {
		collector.write({ ...record(), credential: { id: 'cred-1' } });
		collector.write({ ...record(), credential: { managedBy: 'aiGateway' } });
		collector.write(record());

		await collector.flush();

		const rows = repository.insertIgnoringDuplicates.mock.calls[0][0];
		expect(rows.map(({ credentialId, managedBy }) => ({ credentialId, managedBy }))).toEqual([
			{ credentialId: 'cred-1', managedBy: null },
			{ credentialId: null, managedBy: 'aiGateway' },
			{ credentialId: null, managedBy: null },
		]);
	});

	it('starts a flush at once when the buffer reaches 500 records', () => {
		for (let i = 0; i < 500; i++) collector.write(record());

		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledTimes(1);
		expect(repository.insertIgnoringDuplicates.mock.calls[0][0]).toHaveLength(500);
	});

	it('writes the records that arrive during a flush in that flush, never in parallel', async () => {
		let finish = () => {};
		repository.insertIgnoringDuplicates.mockReturnValue(
			new Promise((resolve) => (finish = resolve)),
		);
		collector.write(record());
		const running = collector.flush();
		collector.write(record());
		const joined = collector.flush();
		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledTimes(1);

		finish();
		await Promise.all([running, joined]);

		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledTimes(2);
		expect(repository.insertIgnoringDuplicates.mock.calls[1][0]).toHaveLength(1);
	});

	it('writes a large buffer in batches of 500 after a failed write', async () => {
		repository.insertIgnoringDuplicates.mockRejectedValueOnce(new Error('database down'));
		collector.write(record());
		await collector.flush();
		for (let i = 0; i < 1_199; i++) collector.write(record());

		vi.advanceTimersByTime(5_000);
		await collector.flush();

		const batches = repository.insertIgnoringDuplicates.mock.calls.slice(1);
		expect(batches.map(([rows]) => rows.length)).toEqual([500, 500, 200]);
	});

	it('keeps the records after a failed write and writes them after the backoff', async () => {
		repository.insertIgnoringDuplicates.mockRejectedValueOnce(new Error('database down'));
		collector.write(record());

		await expect(collector.flush()).resolves.toBeUndefined();
		await collector.flush();
		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(5_000);
		await collector.flush();
		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledTimes(2);
		expect(repository.insertIgnoringDuplicates.mock.calls[1][0]).toHaveLength(1);
	});

	it('flushes the remaining records on shutdown, then writes each new record at once', async () => {
		collector.write(record());

		await collector.shutdown();
		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledTimes(1);

		collector.write(record());
		expect(repository.insertIgnoringDuplicates).toHaveBeenCalledTimes(2);
	});

	describe('reprice', () => {
		const unpriced = (callId: string, model: string) =>
			({
				callId,
				provider: 'openai',
				model,
				inputTokens: 100,
				outputTokens: 10,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
			}) as Awaited<ReturnType<LlmUsageRepository['findUnpriced']>>[number];
		let catalogChanged: () => void;

		beforeEach(() => {
			repository.findUnpriced
				.mockReset()
				.mockResolvedValue([unpriced('c-1', 'known'), unpriced('c-2', 'new')]);
			repository.setPrices.mockReset().mockResolvedValue(undefined);
			catalog.lookup.mockImplementation((_provider, model) =>
				model === 'known' ? { input: 0.01, output: 0.02 } : undefined,
			);
			catalog.onChange.mockImplementation((listener) => (catalogChanged = listener));
			collector.start();
		});

		afterEach(async () => await collector.shutdown());

		it('does nothing until a new catalog loads', async () => {
			await collector.reprice();

			expect(repository.findUnpriced).not.toHaveBeenCalled();
		});

		it('prices the unpriced calls of the last 90 days once after each new catalog', async () => {
			vi.setSystemTime(new Date('2026-10-22T00:00:00Z'));
			catalogChanged();

			await collector.reprice();
			await collector.reprice();

			expect(repository.findUnpriced).toHaveBeenCalledTimes(1);
			expect(repository.findUnpriced).toHaveBeenCalledWith(
				new Date('2026-07-24T00:00:00Z'),
				1_000,
				undefined,
			);
			expect(repository.setPrices).toHaveBeenCalledWith([{ callId: 'c-1', estimatedCostUsd: 1.2 }]);

			catalogChanged();
			await collector.reprice();

			expect(repository.findUnpriced).toHaveBeenCalledTimes(2);
		});

		it('leaves repricing to the leader main process', async () => {
			const follower = new LlmUsageCollector(
				repository,
				catalog,
				mock<InstanceSettings>({ isLeader: false }),
				logger,
				publishers,
				budgetSpend,
			);
			follower.start();
			catalogChanged();

			await follower.reprice();

			expect(repository.findUnpriced).not.toHaveBeenCalled();
			await follower.shutdown();
		});

		it('reads the unpriced calls page by page', async () => {
			const page = Array.from({ length: 1_000 }, (_, index) => unpriced(`c-${index}`, 'known'));
			repository.findUnpriced.mockResolvedValueOnce(page).mockResolvedValueOnce([]);
			catalogChanged();

			await collector.reprice();

			expect(repository.findUnpriced).toHaveBeenCalledTimes(2);
			expect(repository.findUnpriced).toHaveBeenLastCalledWith(expect.any(Date), 1_000, 'c-999');
		});

		it('tries again on the next tick when the database fails', async () => {
			catalogChanged();
			repository.findUnpriced.mockRejectedValueOnce(new Error('down'));

			await collector.reprice();
			await collector.reprice();

			expect(repository.setPrices).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalled();
		});
	});
});
