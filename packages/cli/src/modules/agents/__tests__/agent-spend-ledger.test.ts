import type { SpendEntry } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { AgentSpendLedger } from '../budget-guardrail';
import type { AgentBudgetSpendRepository } from '../repositories/agent-budget-spend.repository';

const entry = (key: string, usd: number): SpendEntry => ({ key, usd });

/** Repository whose writes and reads fail while `down` is true. */
function flakyRepository() {
	const repository = mock<AgentBudgetSpendRepository>();
	const state = { down: true };
	repository.applySpend.mockImplementation(async (_callId: string, entries: SpendEntry[]) => {
		if (state.down) throw new Error('database is down');
		return entries.map((e) => ({ key: e.key, totalUsd: e.usd, previousUsd: 0 }));
	});
	repository.readTotal.mockImplementation(async (key: string) => {
		if (state.down) throw new Error('database is down');
		return key === 'recovered-key' ? 42 : 0;
	});
	return { repository, state };
}

describe('AgentSpendLedger', () => {
	it('records spend when the database is up', async () => {
		const repository = mock<AgentBudgetSpendRepository>();
		repository.applySpend.mockResolvedValue([{ key: 'k', totalUsd: 1, previousUsd: 0 }]);
		const ledger = new AgentSpendLedger(repository, mock<Logger>());

		await expect(ledger.add('call-1', [entry('k', 1)])).resolves.toEqual([
			{ key: 'k', totalUsd: 1, previousUsd: 0 },
		]);
	});

	it('buffers the call and does not throw when the write fails', async () => {
		const { repository } = flakyRepository();
		const ledger = new AgentSpendLedger(repository, mock<Logger>());

		await expect(ledger.add('call-1', [entry('k', 1.5)])).resolves.toEqual([
			{ key: 'k', totalUsd: 1.5, previousUsd: 0 },
		]);
	});

	it('reads the buffered totals when the read fails', async () => {
		const { repository } = flakyRepository();
		const ledger = new AgentSpendLedger(repository, mock<Logger>());

		await ledger.add('call-1', [entry('session-1', 1), entry('agent-1:2026-10', 1)]);
		await ledger.add('call-2', [entry('session-1', 0.5)]);

		await expect(ledger.read('session-1')).resolves.toBe(1.5);
		await expect(ledger.read('agent-1:2026-10')).resolves.toBe(1);
		await expect(ledger.read('unknown')).resolves.toBe(0);
	});

	it('includes buffered spend when a read succeeds after a failed flush', async () => {
		const repository = mock<AgentBudgetSpendRepository>();
		// Writes keep failing (write-lock timeout); reads succeed.
		repository.applySpend.mockRejectedValue(new Error('write lock timeout'));
		repository.readTotal.mockResolvedValue(0.25);
		const ledger = new AgentSpendLedger(repository, mock<Logger>());

		await ledger.add('call-1', [entry('session-1', 1.5)]);

		// 0.25 stored + 1.50 still buffered: a 1 USD session cap must stop the next call.
		await expect(ledger.read('session-1')).resolves.toBe(1.75);
	});

	it('reconstructs the buffered previous total without float noise', async () => {
		const { repository } = flakyRepository();
		const ledger = new AgentSpendLedger(repository, mock<Logger>());

		await ledger.add('call-1', [entry('k', 8)]);

		// 8.2 - 0.2 is 7.999999999999999 in binary float; the alert check needs exactly 8.
		await expect(ledger.add('call-2', [entry('k', 0.2)])).resolves.toEqual([
			{ key: 'k', totalUsd: 8.2, previousUsd: 8 },
		]);
	});

	it('flushes buffered calls in arrival order on the next add after recovery', async () => {
		const { repository, state } = flakyRepository();
		const ledger = new AgentSpendLedger(repository, mock<Logger>());

		await ledger.add('call-1', [entry('k', 1)]);
		await ledger.add('call-2', [entry('k', 2)]);
		state.down = false;
		await ledger.add('call-3', [entry('k', 3)]);

		expect(repository.applySpend.mock.calls.map(([callId]) => callId)).toEqual([
			'call-1', // first add, fails
			'call-1', // flush attempt during the second add, fails
			'call-2', // second add, fails
			'call-1', // flush after recovery
			'call-2',
			'call-3',
		]);
	});

	it('flushes the buffer on read once the database recovers', async () => {
		const { repository, state } = flakyRepository();
		const ledger = new AgentSpendLedger(repository, mock<Logger>());

		await ledger.add('call-1', [entry('recovered-key', 1)]);
		state.down = false;

		await expect(ledger.read('recovered-key')).resolves.toBe(42);
		expect(repository.applySpend.mock.calls.map(([callId]) => callId)).toEqual([
			'call-1', // add, fails
			'call-1', // flush during the read
		]);

		// The buffer is empty now: a second read must not replay the call.
		await ledger.read('recovered-key');
		expect(repository.applySpend).toHaveBeenCalledTimes(2);
	});

	it('drops the oldest buffered call when the buffer is full', async () => {
		const { repository } = flakyRepository();
		const logger = mock<Logger>();
		const ledger = new AgentSpendLedger(repository, logger);

		for (let i = 0; i < 10_001; i++) {
			await ledger.add(`call-${i}`, [entry('k', 1)]);
		}

		// call-0 dropped, call-1..call-10000 buffered at 1 USD each
		await expect(ledger.read('k')).resolves.toBe(10_000);
		expect(logger.warn).toHaveBeenCalledWith(
			'Budget spend buffer is full; dropped the oldest buffered call',
			{ callId: 'call-0' },
		);
	});
});
