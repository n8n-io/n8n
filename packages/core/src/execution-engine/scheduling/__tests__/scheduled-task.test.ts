import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import { UnexpectedError } from 'n8n-workflow';
import type { ScheduleInterval, Workflow } from 'n8n-workflow';

import { ScheduledTask } from '../scheduled-task';

describe('ScheduledTask', () => {
	const workflow = mock<Workflow>({ id: 'workflow1', timezone: 'UTC' });

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2023-04-15T14:30:45Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('constructor', () => {
		it('should throw when workflow timezone is invalid', () => {
			const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 1 };
			const workflow = mock<Workflow>({ timezone: 'random timezone string' });
			expect(() => new ScheduledTask(interval, workflow)).toThrow('Invalid timezone.');
		});

		it('should set workflowId and timezone from workflow', () => {
			const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 1 };
			const workflow = mock<Workflow>({ id: 'test-workflow', timezone: 'Europe/Berlin' });
			const task = new ScheduledTask(interval, workflow);

			expect(task.workflowId).toBe('test-workflow');
			expect(task.timezone).toBe('Europe/Berlin');
		});
	});

	describe('start and stop', () => {
		it('should call onTick at scheduled intervals', () => {
			const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 5 };
			const task = new ScheduledTask(interval, workflow);
			const onTick = jest.fn();

			task.start(onTick);

			// First tick after 5 seconds
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(1);

			// Second tick after another 5 seconds
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(2);
		});

		it('should stop calling onTick after stop is called', () => {
			const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 5 };
			const task = new ScheduledTask(interval, workflow);
			const onTick = jest.fn();

			task.start(onTick);

			// First tick after 5 seconds
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(1);

			// Stop the task
			task.stop();

			// Advance time further, should not trigger more calls
			jest.advanceTimersByTime(10000);
			expect(onTick).toHaveBeenCalledTimes(1);
		});

		it('should handle errors in onTick callback', () => {
			const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 5 };
			const task = new ScheduledTask(interval, workflow);
			const onTick = jest.fn().mockImplementation(() => {
				throw new Error('Test error');
			});

			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			task.start(onTick);

			// Should call onTick and catch the error
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(1);

			// Should continue to schedule next ticks despite error
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(2);

			consoleSpy.mockRestore();
		});

		it('should handle case where nextTick is in the past', () => {
			const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 5 };
			const task = new ScheduledTask(interval, workflow);
			const onTick = jest.fn();

			// Mock nextTick to return a past time
			jest.spyOn(task, 'nextTick').mockImplementation(() => {
				const pastTime = new Date();
				pastTime.setSeconds(pastTime.getSeconds() - 10); // 10 seconds in the past
				return DateTime.fromJSDate(pastTime);
			});

			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			task.start(onTick);

			// Should log warning but not call onTick
			expect(consoleSpy).toHaveBeenCalledWith('Cant schedule in the past');
			expect(onTick).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('nextTick', () => {
		describe('seconds interval', () => {
			it('should calculate next trigger for every second', () => {
				const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 1 };
				const task = new ScheduledTask(interval, workflow);

				// Initial next trigger should be 1 second from now
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:30:46.000Z');

				// Advance time by 1 second
				jest.advanceTimersByTime(1000);

				// Next trigger should be updated
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:30:47.000Z');
			});

			it('should calculate next trigger for every 10 seconds', () => {
				const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 10 };
				const task = new ScheduledTask(interval, workflow);

				// Current second is 45, so next trigger should be at second 50
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:30:50.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(5000 + 1);

				// Next trigger should now be at second 0 of the next minute
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:31:00.001Z');
			});

			it('should handle exact boundary for seconds interval', () => {
				// Set time to exactly 14:30:00
				jest.setSystemTime(new Date('2023-04-15T14:30:00Z'));

				const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 30 };
				const task = new ScheduledTask(interval, workflow);

				// Should add full interval when current second is on boundary
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:30:30.000Z');
			});
		});

		describe('minutes interval', () => {
			it('should calculate next trigger for every minute', () => {
				const interval: ScheduleInterval = { field: 'minutes', minutesInterval: 1 };
				const task = new ScheduledTask(interval, workflow);

				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:31:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(60 * 1000 + 1);

				// Next trigger should be the next minute
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:32:00.000Z');
			});

			it('should calculate next trigger for every 15 minutes', () => {
				const interval: ScheduleInterval = { field: 'minutes', minutesInterval: 15 };
				const task = new ScheduledTask(interval, workflow);

				// Current minute is 30, so next trigger should be at minute 45
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:45:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(15 * 60 * 1000 + 1);

				// Next trigger should be at minute 0 of the next hour
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T15:00:00.000Z');
			});

			it('should handle exact boundary for minutes interval', () => {
				// Set time to exactly 14:30:00
				jest.setSystemTime(new Date('2023-04-15T14:30:00Z'));

				const interval: ScheduleInterval = { field: 'minutes', minutesInterval: 30 };
				const task = new ScheduledTask(interval, workflow);

				// Should add full interval when current minute is on boundary
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T15:00:00.000Z');
			});
		});

		describe('hours interval', () => {
			it('should calculate next trigger at specific minute within current hour', () => {
				const interval: ScheduleInterval = {
					field: 'hours',
					hoursInterval: 1,
					triggerAtMinute: [45],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is 14:30, so next trigger should be at 14:45
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:45:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(15 * 60 * 1000 + 1);

				// Next trigger should be at the next hour
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T15:45:00.000Z');
			});

			it('should handle multi-hour intervals', () => {
				const interval: ScheduleInterval = {
					field: 'hours',
					hoursInterval: 3,
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current hour is 14, next 3-hour interval is at 15 (15, 18, 21, 0, ...)
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T15:00:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(30 * 60 * 1000 + 1);

				// Next trigger should be 3 hours after the last one
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T18:00:00.000Z');
			});

			it('should handle hour crossing day boundary', () => {
				// Set time to 22:30
				jest.setSystemTime(new Date('2023-04-15T22:30:00Z'));

				const interval: ScheduleInterval = {
					field: 'hours',
					hoursInterval: 3,
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Next interval should be at 00:00 next day
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-16T00:00:00.000Z');
			});

			it('should handle multiple trigger minutes', () => {
				const interval: ScheduleInterval = {
					field: 'hours',
					hoursInterval: 1,
					triggerAtMinute: [15, 30, 45],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is 14:30:45, next trigger should be 14:45
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T14:45:00.000Z');

				// If we advance to 14:31
				jest.setSystemTime(new Date('2023-04-15T14:31:00Z'));

				// Next trigger should still be 14:45
				const nextTime2 = task.nextTick();
				expect(nextTime2.toISO()).toBe('2023-04-15T14:45:00.000Z');

				// If we advance to 14:46
				jest.setSystemTime(new Date('2023-04-15T14:46:00Z'));

				// Next trigger should be 15:15 (first minute in next hour)
				const nextTime3 = task.nextTick();
				expect(nextTime3.toISO()).toBe('2023-04-15T15:15:00.000Z');
			});
		});

		describe('days interval', () => {
			it('should calculate next trigger later today', () => {
				const interval: ScheduleInterval = {
					field: 'days',
					daysInterval: 1,
					triggerAtHour: [16],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is 14:30, so next trigger should be at 16:00 today
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T16:00:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(1.5 * 60 * 60 * 1000 + 1);

				// Next trigger should be tomorrow
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-16T16:00:00.000Z');
			});

			it('should handle multi-day intervals', () => {
				const interval: ScheduleInterval = {
					field: 'days',
					daysInterval: 3,
					triggerAtHour: [9],
					triggerAtMinute: [30],
				};
				const task = new ScheduledTask(interval, workflow);

				// Next trigger should be at 9:30 today or in 3 days
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-18T09:30:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(19 * 60 * 60 * 1000 + 1);

				// Next trigger should be 3 days later
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-19T09:30:00.000Z');
			});

			it('should handle multiple trigger hours in a day', () => {
				const interval: ScheduleInterval = {
					field: 'days',
					daysInterval: 1,
					triggerAtHour: [9, 12, 15, 18],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is 14:30, next trigger should be 15:00 today
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T15:00:00.000Z');

				// If we advance to 15:30
				jest.setSystemTime(new Date('2023-04-15T15:30:00Z'));

				// Next trigger should be 18:00 today
				const nextTime2 = task.nextTick();
				expect(nextTime2.toISO()).toBe('2023-04-15T18:00:00.000Z');

				// If we advance to 18:30
				jest.setSystemTime(new Date('2023-04-15T18:30:00Z'));

				// Next trigger should be 9:00 tomorrow
				const nextTime3 = task.nextTick();
				expect(nextTime3.toISO()).toBe('2023-04-16T09:00:00.000Z');
			});
		});

		describe('weeks interval', () => {
			it('should calculate next trigger on specified day this week', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDayOfWeek: [6], // Saturday
					triggerAtHour: [16],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is 14:30 on Saturday, so next trigger should be at 16:00 today
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-15T16:00:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(2.5 * 24 * 60 * 60 * 1000 + 1);

				// Next trigger should be in a week
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-22T16:00:00.000Z');
			});

			it('should calculate next trigger on the next occurrence of day', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDayOfWeek: [1], // Monday
					triggerAtHour: [9],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is on Saturday, so next trigger should be on Monday (2 days later)
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-17T09:00:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(2.5 * 24 * 60 * 60 * 1000 + 1);

				// Next trigger should be a week after
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-24T09:00:00.000Z');
			});

			it('should handle multiple days in a week', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDayOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
					triggerAtHour: [9],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is Saturday, next trigger should be Monday
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-17T09:00:00.000Z');

				// If we advance to Monday afternoon
				jest.setSystemTime(new Date('2023-04-17T12:00:00Z'));

				// Next trigger should be Wednesday
				const nextTime2 = task.nextTick();
				expect(nextTime2.toISO()).toBe('2023-04-19T09:00:00.000Z');
			});

			it('should handle multi-week intervals', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 2,
					triggerAtDayOfWeek: [1], // Monday
					triggerAtHour: [9],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is Saturday, next trigger should be Monday
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-17T09:00:00.000Z');

				// If we advance to after that trigger
				jest.setSystemTime(new Date('2023-04-17T10:00:00Z'));

				// Next trigger should be 2 weeks later
				const nextTime2 = task.nextTick();
				expect(nextTime2.toISO()).toBe('2023-05-01T09:00:00.000Z');
			});
		});

		describe('months interval', () => {
			it('should calculate next trigger later this month', () => {
				const interval: ScheduleInterval = {
					field: 'months',
					monthsInterval: 1,
					triggerAtDayOfMonth: [20],
					triggerAtHour: [9],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current day is 15th, so next trigger should be on the 20th
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-20T09:00:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(5 * 24 * 60 * 60 * 1000 + 1);

				// Next trigger should be on the 20th of next month
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-05-20T09:00:00.000Z');
			});

			it('should handle multi-month intervals', () => {
				const interval: ScheduleInterval = {
					field: 'months',
					monthsInterval: 3,
					triggerAtDayOfMonth: [1],
					triggerAtHour: [9],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Next trigger should be on the 1st of next month (May)
				let nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-07-01T09:00:00.000Z');

				// Advance time to just after trigger
				jest.advanceTimersByTime(16 * 24 * 60 * 60 * 1000 + 1);

				// Next trigger should be on the 1st, 3 months later (August)
				nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-08-01T09:00:00.000Z');
			});

			it('should handle multiple days in a month', () => {
				const interval: ScheduleInterval = {
					field: 'months',
					monthsInterval: 1,
					triggerAtDayOfMonth: [1, 15, 28],
					triggerAtHour: [9],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Current time is 15th, next trigger should be 28th
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-04-28T09:00:00.000Z');

				// If we advance to 28th afternoon
				jest.setSystemTime(new Date('2023-04-28T12:00:00Z'));

				// Next trigger should be 1st of next month
				const nextTime2 = task.nextTick();
				expect(nextTime2.toISO()).toBe('2023-05-01T09:00:00.000Z');
			});

			it('should handle months with different number of days', () => {
				// Set date to Feb 15, 2023
				jest.setSystemTime(new Date('2023-02-15T12:00:00Z'));

				const interval: ScheduleInterval = {
					field: 'months',
					monthsInterval: 1,
					triggerAtDayOfMonth: [30],
					triggerAtHour: [9],
					triggerAtMinute: [0],
				};
				const task = new ScheduledTask(interval, workflow);

				// Feb doesn't have 30 days, so next trigger should be March 30
				const nextTime = task.nextTick();
				expect(nextTime.toISO()).toBe('2023-03-30T09:00:00.000Z');
			});
		});

		describe('timezone handling', () => {
			it('should respect the specified timezone - America/New_York', () => {
				// System time is 2023-04-15T14:30:45 UTC
				// In New York (UTC-4), it's 10:30:45
				const interval: ScheduleInterval = {
					field: 'days',
					daysInterval: 1,
					triggerAtHour: [12], // Noon in New York
					triggerAtMinute: [0],
				};

				const task = new ScheduledTask(interval, mock<Workflow>({ timezone: 'America/New_York' }));

				// Next trigger should be 12:00 New York time (16:00 UTC)
				const nextTime = task.nextTick();

				// Ensure this is returned in UTC
				expect(nextTime.hour).toBe(12); // Should be 12 in NY timezone
				expect(nextTime.zoneName).toBe('America/New_York');

				// If we convert to UTC, it should be 16:00
				expect(nextTime.toUTC().hour).toBe(16);
			});

			it('should handle daylight saving time transitions', () => {
				// Test with a date near DST transition
				jest.setSystemTime(new Date('2023-03-11T12:00:00Z')); // Day before US DST spring forward

				const interval: ScheduleInterval = {
					field: 'days',
					daysInterval: 1,
					triggerAtHour: [2], // 2 AM local time - ambiguous during spring forward
					triggerAtMinute: [30],
				};

				const task = new ScheduledTask(interval, mock<Workflow>({ timezone: 'America/New_York' }));

				// Next trigger should be 2:30 AM the next day, which is skipped in DST
				// Luxon should handle this correctly by moving to 3:30 AM
				const nextTime = task.nextTick();

				// The day should be March 12th
				expect(nextTime.day).toBe(12);
				expect(nextTime.month).toBe(3);

				// Instead of 2:30, it should be 3:30 due to DST spring forward
				expect(nextTime.hour).toBe(3);
				expect(nextTime.minute).toBe(30);
			});
		});

		describe('error handling', () => {
			it('should throw UnexpectedError for invalid interval', () => {
				// @ts-expect-error - Testing with invalid field
				const interval: ScheduleInterval = { field: 'invalid' };
				const task = new ScheduledTask(interval, workflow);

				expect(() => task.nextTick()).toThrow(UnexpectedError);
				expect(() => task.nextTick()).toThrow('Invalid interval. Cannot schedule this task');
			});
		});
	});

	describe('integration tests', () => {
		it('should properly chain scheduled events', () => {
			const interval: ScheduleInterval = { field: 'seconds', secondsInterval: 5 };
			const task = new ScheduledTask(interval, workflow);
			const onTick = jest.fn();

			task.start(onTick);

			// First tick after 5 seconds
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(1);

			// Second tick after another 5 seconds
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(2);

			// Third tick after another 5 seconds
			jest.advanceTimersByTime(5000);
			expect(onTick).toHaveBeenCalledTimes(3);
		});

		it('should adjust schedule after system time changes', () => {
			const interval: ScheduleInterval = { field: 'minutes', minutesInterval: 5 };
			const task = new ScheduledTask(interval, workflow);
			const onTick = jest.fn();

			task.start(onTick);

			// Set time 4 minutes forward
			jest.advanceTimersByTime(4 * 60 * 1000);
			expect(onTick).toHaveBeenCalledTimes(0);

			// Now set the system time forward by 10 minutes
			jest.setSystemTime(new Date('2023-04-15T14:44:45Z'));

			// Next tick should still occur 1 minute after the original expected time
			jest.advanceTimersByTime(1 * 60 * 1000);
			expect(onTick).toHaveBeenCalledTimes(1);
		});
	});
});
