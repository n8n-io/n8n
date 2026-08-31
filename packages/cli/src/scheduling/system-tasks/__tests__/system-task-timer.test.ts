import { Time } from '@n8n/constants';
import type { SystemTaskSchedule } from '@n8n/decorators';
import { scheduleFromDefinition } from '@n8n/scheduler';

import { SystemTaskTimer } from '../system-task-timer';

const START = new Date('2026-01-01T00:00:00.000Z');

/** The longest delay Node's `setTimeout` accepts before it fires straight away. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

describe('SystemTaskTimer', () => {
	const onFire = vi.fn();
	const onPlanError = vi.fn();

	function createTimer(schedule: SystemTaskSchedule) {
		return new SystemTaskTimer(scheduleFromDefinition(schedule, 'UTC'), onFire, onPlanError);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(START);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('fires on every occurrence of an interval schedule', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 60 });

		timer.start(new Date());

		vi.advanceTimersByTime(59 * Time.seconds.toMilliseconds);
		expect(onFire).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1 * Time.seconds.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(3 * 60 * Time.seconds.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(4);
	});

	it('fires on every occurrence of a cron schedule', () => {
		const timer = createTimer({ kind: 'cron', cronExpression: '0 0 * * * *', timezone: 'UTC' });

		timer.start(new Date());

		vi.advanceTimersByTime(59 * Time.minutes.toMilliseconds);
		expect(onFire).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1 * Time.minutes.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1 * Time.hours.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(2);
	});

	it('seeds a recurring cron at its next cron instant, not a stride away', () => {
		const timer = createTimer({
			kind: 'recurring_cron',
			cronExpression: '0 0 * * *',
			timezone: 'UTC',
			recurrenceUnit: 'days',
			recurrenceSize: 3,
		});

		timer.start(new Date());

		// The every-N rule has no previous fire to count from yet, so the first fire
		// is the next cron instant.
		vi.advanceTimersByTime(1 * Time.days.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(1);

		// From there the rule applies: three days on from the fire, not from the start.
		vi.advanceTimersByTime(2 * Time.days.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1 * Time.days.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(2);
	});

	it('coalesces the occurrences a stalled process slept through', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition({ kind: 'interval', intervalSeconds: 60 }, 'UTC'),
			onFire,
			onPlanError,
			() => clock,
		);

		timer.start(new Date(clock));

		// An hour of occurrences goes by with the event loop blocked: the wall clock
		// moved on, the callback only runs once the loop is free again.
		clock = START.getTime() + Time.hours.toMilliseconds;
		vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(1);

		// The cadence resumes from there rather than replaying the backlog.
		vi.advanceTimersByTime(59 * Time.seconds.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1 * Time.seconds.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(2);
	});

	it('hops to the horizon instead of firing at once when the next fire is far off', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 40 * Time.days.toSeconds });

		timer.start(new Date());

		vi.advanceTimersByTime(MAX_TIMEOUT_MS);
		expect(onFire).not.toHaveBeenCalled();

		vi.advanceTimersByTime(40 * Time.days.toMilliseconds - MAX_TIMEOUT_MS);
		expect(onFire).toHaveBeenCalledTimes(1);
	});

	it('still fires an occurrence the process slept through during a horizon hop', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition(
				{ kind: 'interval', intervalSeconds: 40 * Time.days.toSeconds },
				'UTC',
			),
			onFire,
			onPlanError,
			() => clock,
		);

		timer.start(new Date(clock));

		// The fire time passes while the hop is pending, so the hop's callback finds
		// it already behind: the occurrence is late, not skipped.
		clock = START.getTime() + 50 * Time.days.toMilliseconds;
		vi.advanceTimersByTime(MAX_TIMEOUT_MS + 1);

		expect(onFire).toHaveBeenCalledTimes(1);
	});

	it('reports a schedule it cannot plan and stays stopped', () => {
		const timer = createTimer({ kind: 'cron', cronExpression: 'not-a-cron', timezone: 'UTC' });

		timer.start(new Date());

		expect(onPlanError).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(10 * Time.days.toMilliseconds);
		expect(onFire).not.toHaveBeenCalled();
	});

	it('reports a fire time past the representable date range and stays stopped', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: Number.MAX_SAFE_INTEGER });

		timer.start(new Date());

		expect(onPlanError).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(10 * Time.days.toMilliseconds);
		expect(onFire).not.toHaveBeenCalled();
	});

	it('does not keep the process alive while waiting', () => {
		const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
		const timer = createTimer({ kind: 'interval', intervalSeconds: 60 });

		timer.start(new Date());

		const pending = setTimeoutSpy.mock.results.at(-1)?.value as NodeJS.Timeout;
		expect(pending.hasRef()).toBe(false);
		setTimeoutSpy.mockRestore();
	});

	it('stops firing once stopped', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 60 });

		timer.start(new Date());
		timer.stop();

		vi.advanceTimersByTime(10 * 60 * Time.seconds.toMilliseconds);
		expect(onFire).not.toHaveBeenCalled();
	});

	it('replaces a running timer on restart, rather than firing twice', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 60 });

		timer.start(new Date());
		vi.advanceTimersByTime(30 * Time.seconds.toMilliseconds);
		timer.start(new Date());

		vi.advanceTimersByTime(30 * Time.seconds.toMilliseconds);
		expect(onFire).not.toHaveBeenCalled();

		vi.advanceTimersByTime(30 * Time.seconds.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(1);
	});

	it('keeps the cadence after a fire throws', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 60 });
		onFire.mockImplementationOnce(() => {
			throw new Error('failed');
		});

		timer.start(new Date());

		expect(() => vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds)).toThrow('failed');

		vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds);
		expect(onFire).toHaveBeenCalledTimes(2);
	});
});
