import { UnexpectedError } from '@n8n/errors';

import {
	ExecutionLedgerBacklogProbe,
	type ExecutionLedgerBacklogStats,
} from '../execution-ledger-backlog-probe';

describe('ExecutionLedgerBacklogProbe', () => {
	const stats: ExecutionLedgerBacklogStats = {
		rows: 3,
		oldestOccurredAt: new Date('2026-10-30T10:00:00Z'),
	};
	let probe: ExecutionLedgerBacklogProbe;

	beforeEach(() => {
		probe = new ExecutionLedgerBacklogProbe();
	});

	it('is not registered before register is called', () => {
		expect(probe.isRegistered).toBe(false);
	});

	it('is registered after register is called', () => {
		probe.register(async () => await Promise.resolve(stats));

		expect(probe.isRegistered).toBe(true);
	});

	it('returns the stats the registered provider resolves', async () => {
		probe.register(async () => await Promise.resolve(stats));

		await expect(probe.getStats()).resolves.toBe(stats);
	});

	it('throws UnexpectedError from getStats when no provider is registered', async () => {
		await expect(probe.getStats()).rejects.toThrow(UnexpectedError);
	});

	it('throws UnexpectedError on a second register and keeps the first provider', async () => {
		const second = { rows: 99, oldestOccurredAt: null };
		probe.register(async () => await Promise.resolve(stats));

		expect(() => probe.register(async () => await Promise.resolve(second))).toThrow(
			UnexpectedError,
		);
		await expect(probe.getStats()).resolves.toBe(stats);
	});
});
