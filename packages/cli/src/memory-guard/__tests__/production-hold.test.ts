import type { EventService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import { ProductionHold } from '../production-hold';

describe('ProductionHold', () => {
	const eventService = mock<EventService>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	/** Resolves with whether the held execution was let through. */
	const isAdmitted = async (promise: Promise<void>) => {
		let admitted = false;
		void promise.then(() => {
			admitted = true;
		});
		await new Promise(process.nextTick);
		return admitted;
	};

	it('should hold only production executions, and only during a hold', () => {
		const hold = new ProductionHold(eventService);
		expect(hold.shouldHold('webhook')).toBe(false);

		hold.start();

		expect(hold.shouldHold('webhook')).toBe(true);
		expect(hold.shouldHold('manual')).toBe(false);
	});

	it('should keep holding new arrivals after the hold ends while executions still wait', () => {
		const hold = new ProductionHold(eventService);
		hold.start();
		void hold.wait('1');

		hold.end();

		expect(hold.shouldHold('webhook')).toBe(true);
	});

	it('should let held executions start oldest first, and only as many as asked', async () => {
		const hold = new ProductionHold(eventService);
		hold.start();
		const first = hold.wait('1');
		const second = hold.wait('2');

		expect(hold.admit(1)).toBe(1);

		expect(await isAdmitted(first)).toBe(true);
		expect(await isAdmitted(second)).toBe(false);
	});

	it('should never resume a removed execution', async () => {
		const hold = new ProductionHold(eventService);
		hold.start();
		const held = hold.wait('1');

		expect(hold.remove('1')).toBe(true);
		expect(hold.remove('1')).toBe(false);
		hold.admit(10);

		expect(await isAdmitted(held)).toBe(false);
		expect(hold.has('1')).toBe(false);
	});

	it('should report when the oldest held execution started to wait', () => {
		vi.useFakeTimers({ now: 1_000 });
		const hold = new ProductionHold(eventService);
		hold.start();
		void hold.wait('1');
		vi.setSystemTime(2_000);
		void hold.wait('2');

		expect(hold.oldestHeldAt).toBe(1_000);
		vi.useRealTimers();
	});

	it('should report when an execution starts to wait, starts, or is cancelled', () => {
		vi.useFakeTimers({ now: 1_000 });
		const hold = new ProductionHold(eventService);
		hold.start();
		void hold.wait('1');
		void hold.wait('2');
		expect(eventService.emit).toHaveBeenCalledWith('memory-guard-execution-held', {
			executionId: '1',
		});

		vi.setSystemTime(3_500);
		hold.admit(1);
		expect(eventService.emit).toHaveBeenCalledWith('memory-guard-execution-released', {
			executionId: '1',
			waitedMs: 2_500,
			started: true,
		});

		vi.setSystemTime(4_000);
		hold.remove('2');
		expect(eventService.emit).toHaveBeenCalledWith('memory-guard-execution-released', {
			executionId: '2',
			waitedMs: 3_000,
			started: false,
		});
		vi.useRealTimers();
	});
});
