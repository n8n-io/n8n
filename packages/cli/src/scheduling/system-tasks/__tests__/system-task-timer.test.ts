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
	const onPlan = vi.fn();

	function createTimer(schedule: SystemTaskSchedule) {
		return new SystemTaskTimer(
			scheduleFromDefinition(schedule, 'UTC'),
			onFire,
			onPlanError,
			onPlan,
		);
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

	it('hands each fire its lag, zero when the timeout fired on time', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 60 });

		timer.start(new Date());
		vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds);

		expect(onFire).toHaveBeenCalledExactlyOnceWith(0, 0);
	});

	it('hands a coalesced fire the time the process slept past the occurrence and the occurrences it stands in for', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition({ kind: 'interval', intervalSeconds: 60 }, 'UTC'),
			onFire,
			onPlanError,
			onPlan,
			() => clock,
		);

		timer.start(new Date(clock));
		clock = START.getTime() + Time.hours.toMilliseconds;
		vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds);

		expect(onFire).toHaveBeenCalledExactlyOnceWith(59 * Time.minutes.toMilliseconds, 59);
	});

	it('hands a fire that wakes before its occurrence no negative lag', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition({ kind: 'interval', intervalSeconds: 60 }, 'UTC'),
			onFire,
			onPlanError,
			onPlan,
			() => clock,
		);

		timer.start(new Date(clock));
		clock = START.getTime() + 59 * Time.seconds.toMilliseconds;
		vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds);

		expect(onFire).toHaveBeenCalledExactlyOnceWith(0, 0);
	});

	it('coalesces the occurrences a stalled process slept through', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition({ kind: 'interval', intervalSeconds: 60 }, 'UTC'),
			onFire,
			onPlanError,
			onPlan,
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

	it('counts a wide gap of interval occurrences in full', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition({ kind: 'interval', intervalSeconds: 1 }, 'UTC'),
			onFire,
			onPlanError,
			onPlan,
			() => clock,
		);

		timer.start(new Date(clock));

		// A decade of one-second occurrences: 315 million, far too many to walk.
		const days = 10 * 365;
		clock = START.getTime() + days * Time.days.toMilliseconds;
		vi.advanceTimersByTime(1 * Time.seconds.toMilliseconds);

		const occurrences = days * Time.days.toSeconds;
		expect(onFire).toHaveBeenCalledExactlyOnceWith(
			(occurrences - 1) * Time.seconds.toMilliseconds,
			occurrences - 1,
		);
	});

	it('caps the occurrences it counts for a walked schedule', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition({ kind: 'cron', cronExpression: '* * * * *', timezone: 'UTC' }, 'UTC'),
			onFire,
			onPlanError,
			onPlan,
			() => clock,
		);

		timer.start(new Date(clock));

		// 30 days of minutes is 43,200 occurrences, above the cap.
		clock = START.getTime() + 30 * Time.days.toMilliseconds;
		vi.advanceTimersByTime(1 * Time.minutes.toMilliseconds);

		expect(onFire).toHaveBeenCalledExactlyOnceWith(
			30 * Time.days.toMilliseconds - Time.minutes.toMilliseconds,
			1_000,
		);
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
			onPlan,
			() => clock,
		);

		timer.start(new Date(clock));

		// The fire time passes while the hop is pending, so the hop's callback finds
		// it already behind: the occurrence is late, not skipped.
		clock = START.getTime() + 50 * Time.days.toMilliseconds;
		vi.advanceTimersByTime(MAX_TIMEOUT_MS + 1);

		expect(onFire).toHaveBeenCalledTimes(1);
	});

	it('announces the occurrence it arms for, on start and on every rearm', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 60 });

		timer.start(new Date());
		expect(onPlan).toHaveBeenCalledExactlyOnceWith(
			new Date(START.getTime() + 60 * Time.seconds.toMilliseconds),
		);

		vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds);
		expect(onPlan).toHaveBeenLastCalledWith(
			new Date(START.getTime() + 120 * Time.seconds.toMilliseconds),
		);
	});

	it('announces the resumed occurrence after a coalesced fire, not the one slept through', () => {
		let clock = START.getTime();
		const timer = new SystemTaskTimer(
			scheduleFromDefinition({ kind: 'interval', intervalSeconds: 60 }, 'UTC'),
			onFire,
			onPlanError,
			onPlan,
			() => clock,
		);

		timer.start(new Date(clock));
		clock = START.getTime() + Time.hours.toMilliseconds;
		vi.advanceTimersByTime(60 * Time.seconds.toMilliseconds);

		expect(onPlan).toHaveBeenLastCalledWith(new Date(clock + 60 * Time.seconds.toMilliseconds));
	});

	it('announces a far-off occurrence once, not at every horizon hop', () => {
		const timer = createTimer({ kind: 'interval', intervalSeconds: 40 * Time.days.toSeconds });

		timer.start(new Date());
		vi.advanceTimersByTime(MAX_TIMEOUT_MS);

		expect(onPlan).toHaveBeenCalledExactlyOnceWith(
			new Date(START.getTime() + 40 * Time.days.toMilliseconds),
		);
	});

	it('announces nothing for a schedule it cannot plan', () => {
		const timer = createTimer({ kind: 'cron', cronExpression: 'not-a-cron', timezone: 'UTC' });

		timer.start(new Date());

		expect(onPlan).not.toHaveBeenCalled();
	});

	it('reports a schedule it cannot plan and stays stopped', () => {
		const timer = createTimer({ kind: 'cron', cronExpression: 'not-a-cron', timezone: 'UTC' });

		timer.start(new Date());

		expect(onPlanError).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(10 * Time.days.toMilliseconds);
		expect(onFire).not.toHaveBeenCalled();
	});

	it('reports a schedule with no next occurrence and stays stopped', () => {
		const timer = new SystemTaskTimer(
			{ kind: 'one_off', fireAt: new Date(START.getTime() - 1) },
			onFire,
			onPlanError,
			onPlan,
		);

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
