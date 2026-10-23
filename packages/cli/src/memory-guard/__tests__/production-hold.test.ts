import { ProductionHold } from '../production-hold';

describe('ProductionHold', () => {
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
		const hold = new ProductionHold();
		expect(hold.shouldHold('webhook')).toBe(false);

		hold.start();

		expect(hold.shouldHold('webhook')).toBe(true);
		expect(hold.shouldHold('manual')).toBe(false);
	});

	it('should keep holding new arrivals after the hold ends while executions still wait', () => {
		const hold = new ProductionHold();
		hold.start();
		void hold.wait('1');

		hold.end();

		expect(hold.shouldHold('webhook')).toBe(true);
	});

	it('should let held executions start oldest first, and only as many as asked', async () => {
		const hold = new ProductionHold();
		hold.start();
		const first = hold.wait('1');
		const second = hold.wait('2');

		expect(hold.admit(1)).toBe(1);

		expect(await isAdmitted(first)).toBe(true);
		expect(await isAdmitted(second)).toBe(false);
	});

	it('should never resume a removed execution', async () => {
		const hold = new ProductionHold();
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
		const hold = new ProductionHold();
		hold.start();
		void hold.wait('1');
		vi.setSystemTime(2_000);
		void hold.wait('2');

		expect(hold.oldestHeldAt).toBe(1_000);
		vi.useRealTimers();
	});
});
