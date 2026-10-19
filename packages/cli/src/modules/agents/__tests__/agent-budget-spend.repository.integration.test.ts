import { randomUUID } from 'node:crypto';

import { testDb, testModules } from '@n8n/backend-test-utils';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AgentBudgetAppliedCall } from '../entities/agent-budget-applied-call.entity';
import { AgentSpendLedger } from '../budget-guardrail';
import { AgentBudgetSpendRepository } from '../repositories/agent-budget-spend.repository';

describe('AgentBudgetSpendRepository', () => {
	let repository: AgentBudgetSpendRepository;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentBudgetSpendRepository);
	});

	beforeEach(async () => {
		await repository.manager.delete(AgentBudgetAppliedCall, {});
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('reads a missing key as 0', async () => {
		await expect(repository.readTotal('missing-key')).resolves.toBe(0);
	});

	it('sums two calls on the same key', async () => {
		const key = 'thread-1';

		const first = await repository.applySpend(randomUUID(), [{ key, usd: 1.25 }]);
		const second = await repository.applySpend(randomUUID(), [{ key, usd: 0.75 }]);

		expect(first).toEqual([{ key, totalUsd: 1.25, previousUsd: 0 }]);
		expect(second).toEqual([{ key, totalUsd: 2, previousUsd: 1.25 }]);
		await expect(repository.readTotal(key)).resolves.toBe(2);
	});

	it('returns the exact pre-increment total at a float boundary', async () => {
		const key = 'thread-1';

		await repository.applySpend(randomUUID(), [{ key, usd: 8 }]);
		const second = await repository.applySpend(randomUUID(), [{ key, usd: 0.2 }]);

		// 8.2 - 0.2 is 7.999999999999999 in binary float. The alert check compares
		// previousUsd with the alert line, so the value must be exactly 8.
		expect(second).toEqual([{ key, totalUsd: 8.2, previousUsd: 8 }]);
	});

	it('adds repeated keys in one call in entry order', async () => {
		const key = 'thread-1';

		// The ledger contract allows repeated keys. Postgres rejects two rows with
		// the same conflict target in one statement, so the upsert coalesces them.
		const totals = await repository.applySpend(randomUUID(), [
			{ key, usd: 1.25 },
			{ key, usd: 0.75 },
		]);

		expect(totals).toEqual([
			{ key, totalUsd: 1.25, previousUsd: 0 },
			{ key, totalUsd: 2, previousUsd: 1.25 },
		]);
		await expect(repository.readTotal(key)).resolves.toBe(2);
	});

	it('counts both calls when two writers add to the same keys at the same time', async () => {
		const sessionKey = 'thread-1';
		const monthKey = 'agent-1:2026-10';

		// Two mains can add spend for the same keys at the same time. The atomic
		// upsert must count both. SQLite serializes the two transactions through
		// the write connection; on Postgres they run as real concurrent transactions.
		const [first, second] = await Promise.all([
			repository.applySpend(randomUUID(), [
				{ key: sessionKey, usd: 1.25 },
				{ key: monthKey, usd: 1.25 },
			]),
			repository.applySpend(randomUUID(), [
				{ key: sessionKey, usd: 0.75 },
				{ key: monthKey, usd: 0.75 },
			]),
		]);

		for (const key of [sessionKey, monthKey]) {
			const results = [...first, ...second].filter((r) => r.key === key);
			expect(results.filter((r) => r.previousUsd === 0)).toHaveLength(1);
			expect(results.filter((r) => r.totalUsd === 2)).toHaveLength(1);
			await expect(repository.readTotal(key)).resolves.toBe(2);
		}
	});

	it('does not add spend again when callId repeats', async () => {
		const callId = randomUUID();
		const key = 'thread-1';

		await repository.applySpend(callId, [{ key, usd: 1.5 }]);
		const replay = await repository.applySpend(callId, [{ key, usd: 1.5 }]);

		expect(replay).toEqual([{ key, totalUsd: 1.5, previousUsd: 1.5 }]);
		await expect(repository.readTotal(key)).resolves.toBe(1.5);
	});

	it('updates the session key and the month key in entry order', async () => {
		const sessionKey = 'thread-1';
		const monthKey = 'agent-1:2026-10';

		const totals = await repository.applySpend(randomUUID(), [
			{ key: sessionKey, usd: 0.5 },
			{ key: monthKey, usd: 0.5 },
		]);

		expect(totals).toEqual([
			{ key: sessionKey, totalUsd: 0.5, previousUsd: 0 },
			{ key: monthKey, totalUsd: 0.5, previousUsd: 0 },
		]);
		await expect(repository.readTotal(sessionKey)).resolves.toBe(0.5);
		await expect(repository.readTotal(monthKey)).resolves.toBe(0.5);
	});

	it('keeps both totals when a new ledger reads the same database', async () => {
		const callId = randomUUID();
		const sessionKey = 'thread-1';
		const monthKey = 'agent-1:2026-10';
		const first = new AgentSpendLedger(repository, mock<Logger>());

		await first.add(callId, [
			{ key: sessionKey, usd: 1.5 },
			{ key: monthKey, usd: 1.5 },
		]);

		const restarted = new AgentSpendLedger(repository, mock<Logger>());
		await expect(restarted.read(sessionKey)).resolves.toBe(1.5);
		await expect(restarted.read(monthKey)).resolves.toBe(1.5);

		const replay = await restarted.add(callId, [
			{ key: sessionKey, usd: 1.5 },
			{ key: monthKey, usd: 1.5 },
		]);
		expect(replay).toEqual([
			{ key: sessionKey, totalUsd: 1.5, previousUsd: 1.5 },
			{ key: monthKey, totalUsd: 1.5, previousUsd: 1.5 },
		]);
	});
});
