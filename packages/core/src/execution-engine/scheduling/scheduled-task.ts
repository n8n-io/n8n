import { inTest } from '@n8n/backend-common';
import { DateTime } from 'luxon';
import type { ScheduleInterval, Workflow } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

export class ScheduledTask {
	private active: boolean = false;

	private timeout?: NodeJS.Timeout;

	readonly workflowId: string;

	readonly timezone: string;

	constructor(
		readonly interval: ScheduleInterval,
		workflow: Workflow,
	) {
		this.workflowId = workflow.id;

		const timezone = workflow.timezone;
		const dt = DateTime.fromObject({}, { zone: timezone });
		if (!dt.isValid) {
			throw new UnexpectedError('Invalid timezone.');
		}
		this.timezone = timezone;
	}

	start(onTick: () => void) {
		const onTimerTrigger = () => {
			if (!this.active) return;

			try {
				void onTick();
			} catch (error) {
				if (!inTest) console.warn('Error in scheduled task', error);
			} finally {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				scheduleNextTick();
			}
		};

		const scheduleNextTick = () => {
			const now = DateTime.now().setZone(this.timezone);
			const delay = this.nextTick().toMillis() - now.toMillis();
			if (delay > 0) {
				this.active = true;
				this.timeout = setTimeout(onTimerTrigger, delay);
			} else {
				// if the `nextTick` is somwhow in the past, we should handle it. for now we just log it
				console.warn('Cant schedule in the past');
			}
		};

		// Schedule the first timer
		scheduleNextTick();
	}

	stop() {
		clearTimeout(this.timeout);
		this.active = false;
	}

	// eslint-disable-next-line complexity
	nextTick(now = DateTime.now().setZone(this.timezone)): DateTime {
		const { interval } = this;

		if (interval.field === 'seconds') {
			// For seconds interval, calculate next occurrence
			const secondsToAdd = interval.secondsInterval - (now.second % interval.secondsInterval);
			// If current second is exactly on interval, add full interval
			return secondsToAdd === 0
				? now.plus({ seconds: interval.secondsInterval })
				: now.plus({ seconds: secondsToAdd });
		}

		if (interval.field === 'minutes') {
			// For minutes interval, get next occurrence
			const nextMinute =
				now.minute + interval.minutesInterval - (now.minute % interval.minutesInterval);

			if (nextMinute >= 60) {
				// Next trigger is in the next hour
				return now.plus({ hours: 1 }).set({ minute: nextMinute % 60, second: 0, millisecond: 0 });
			} else {
				// Next trigger is in the current hour
				return now.set({ minute: nextMinute, second: 0, millisecond: 0 });
			}
		}

		if (interval.field === 'hours') {
			// Check if we need to wait for a specific minute
			const triggerMinutes = interval.triggerAtMinute;

			// Find the next valid minute
			let nextMinute = -1;
			for (const minute of triggerMinutes) {
				if (minute > now.minute) {
					nextMinute = minute;
					break;
				}
			}

			if (nextMinute >= 0) {
				// There's a valid minute in the current hour
				return now.set({ minute: nextMinute, second: 0, millisecond: 0 });
			}

			// Need to wait for the next interval hour
			const nextHour = now.hour + interval.hoursInterval - (now.hour % interval.hoursInterval);
			if (nextHour >= 24) {
				// Next day
				return now.plus({ days: 1 }).set({
					hour: nextHour % 24,
					minute: triggerMinutes[0],
					second: 0,
					millisecond: 0,
				});
			} else {
				return now.set({
					hour: nextHour,
					minute: triggerMinutes[0],
					second: 0,
					millisecond: 0,
				});
			}
		}

		if (interval.field === 'days') {
			const triggerHours = interval.triggerAtHour;
			const triggerMinutes = interval.triggerAtMinute;

			// Check if we have a trigger time later today
			for (const hour of triggerHours) {
				if (hour > now.hour || (hour === now.hour && triggerMinutes[0] > now.minute)) {
					return now.set({
						hour,
						minute: triggerMinutes[0],
						second: 0,
						millisecond: 0,
					});
				}
			}

			// Next trigger is tomorrow or later
			return now.plus({ days: interval.daysInterval }).set({
				hour: triggerHours[0],
				minute: triggerMinutes[0],
				second: 0,
				millisecond: 0,
			});
		}

		const currentDayOfWeek = now.weekday % 7; // Convert Luxon's 1-7 (Mon-Sun) to 0-6 (Sun-Sat)
		if (interval.field === 'weeks') {
			const triggerDays = interval.triggerAtDayOfWeek;
			const triggerHours = interval.triggerAtHour;
			const triggerMinutes = interval.triggerAtMinute;

			// Check if we have a day later this week
			let daysToAdd = 7;
			let sameDayButLaterTime = false;

			for (const day of triggerDays) {
				const dayDiff = (day - currentDayOfWeek + 7) % 7;
				if (dayDiff === 0) {
					// Today is a trigger day, check if time has passed
					if (
						now.hour < triggerHours[0] ||
						(now.hour === triggerHours[0] && now.minute < triggerMinutes[0])
					) {
						daysToAdd = 0;
						sameDayButLaterTime = true;
						break;
					}
				} else if (dayDiff < daysToAdd) {
					daysToAdd = dayDiff;
				}
			}

			// If we're on a trigger day but time has passed,
			// or we're not on a trigger day but found a day later this week
			if (daysToAdd < 7) {
				return now.plus({ days: daysToAdd }).set({
					hour: triggerHours[0],
					minute: triggerMinutes[0],
					second: 0,
					millisecond: 0,
				});
			} else {
				// No valid days found in this week, move to next interval

				// First, determine which day of the week to use
				const firstTriggerDay = Math.min(...triggerDays);

				// Calculate days to the same day next week
				let daysUntilNext;

				if (sameDayButLaterTime) {
					// We're on a trigger day but time has passed, so add full interval
					daysUntilNext = 7 * interval.weeksInterval;
				} else {
					// We need to find the days until the first occurrence of a trigger day
					// after skipping the required number of weeks
					const daysTillFirstOccurrence = (7 + firstTriggerDay - currentDayOfWeek) % 7;
					daysUntilNext = daysTillFirstOccurrence + 7 * (interval.weeksInterval - 1);

					// If we're already past all trigger days this week, don't subtract a week
					if (daysTillFirstOccurrence === 0 && interval.weeksInterval > 1) {
						daysUntilNext = 7 * interval.weeksInterval;
					}
				}

				return now.plus({ days: daysUntilNext }).set({
					hour: triggerHours[0],
					minute: triggerMinutes[0],
					second: 0,
					millisecond: 0,
				});
			}
		}

		const currentDayOfMonth = now.day;
		if (interval.field === 'months') {
			const triggerDays = interval.triggerAtDayOfMonth;
			const triggerHours = interval.triggerAtHour;
			const triggerMinutes = interval.triggerAtMinute;

			// Find the next valid day in this month
			let nextDay = -1;
			for (const day of triggerDays) {
				// Check if this day is valid in the current month
				const daysInMonth = now.daysInMonth;
				if (
					day <= daysInMonth &&
					(day > currentDayOfMonth ||
						(day === currentDayOfMonth &&
							(now.hour < triggerHours[0] ||
								(now.hour === triggerHours[0] && now.minute < triggerMinutes[0]))))
				) {
					nextDay = day;
					break;
				}
			}

			if (nextDay >= 0) {
				// Can trigger later this month
				return now.set({
					day: nextDay,
					hour: triggerHours[0],
					minute: triggerMinutes[0],
					second: 0,
					millisecond: 0,
				});
			} else {
				// Need to wait for next month or interval
				// Find the first valid day in the next month
				const nextMonth = now.plus({ months: interval.monthsInterval });
				const daysInNextMonth = nextMonth.daysInMonth;

				// Find the first valid trigger day for next month
				let validDay = triggerDays[0];
				for (const day of triggerDays) {
					if (day <= daysInNextMonth) {
						validDay = day;
						break;
					}
				}

				return nextMonth.set({
					day: validDay,
					hour: triggerHours[0],
					minute: triggerMinutes[0],
					second: 0,
					millisecond: 0,
				});
			}
		}

		throw new UnexpectedError('Invalid interval. Cannot schedule this task');
	}
}
