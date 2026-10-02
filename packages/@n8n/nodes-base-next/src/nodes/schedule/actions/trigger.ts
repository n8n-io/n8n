import { arr, int, obj, oneOf, str, variant } from '@n8n/node-sdk';

import { schedule } from '../schedule.node';

const hour = int()
	.with({ minimum: 0, maximum: 23 })
	.optional()
	.hint('0-23; a random hour when not set');
const minute = int()
	.with({ minimum: 0, maximum: 59 })
	.optional()
	.hint('0-59; a random minute when not set, so set 0 for on the hour');
const every = (unit: string, fallback: number) =>
	int().with({ minimum: 1 }).default(fallback).hint(`Every n ${unit}`);

/** The Schedule Trigger node, version 1.4. Times are in the workflow timezone. */
export const scheduleTrigger = schedule.trigger('trigger', {
	trigger: 'On schedule',
	summary: 'Starts the workflow at the times of each rule, in the workflow timezone.',
	input: {
		rule: obj({
			interval: arr(
				variant('field', {
					seconds: { secondsInterval: every('seconds', 30) },
					minutes: { minutesInterval: every('minutes', 5) },
					hours: { hoursInterval: every('hours', 1), triggerAtMinute: minute },
					days: { daysInterval: every('days', 1), triggerAtHour: hour, triggerAtMinute: minute },
					weeks: {
						weeksInterval: every('weeks', 1),
						triggerAtDay: arr(int().with({ enum: [0, 1, 2, 3, 4, 5, 6] }))
							.default([0])
							.hint('Weekdays: 0 Sunday, 1 Monday, … 6 Saturday'),
						triggerAtHour: hour,
						triggerAtMinute: minute,
					},
					months: {
						monthsInterval: every('months', 1),
						triggerAtDayOfMonth: int()
							.with({ minimum: 1, maximum: 31 })
							.optional()
							.hint('1-31; a random day 1-28 when not set'),
						triggerAtHour: hour,
						triggerAtMinute: minute,
					},
					cronExpression: {
						expression: str().hint('[Second] Minute Hour Day-of-month Month Day-of-week'),
					},
				}),
			)
				.with({ minItems: 1 })
				.hint('Each rule runs on its own, e.g. daily at 8 and Fridays at 17'),
		}),
		misfirePolicy: oneOf('coalesce', 'coalesce_owner', 'skip')
			.optional()
			.hint('A run that n8n missed: skip it, or run the newest one'),
	},
	output: obj({
		timestamp: str().hint('ISO time of the run in the workflow timezone'),
		'Readable date': str(),
		'Readable time': str(),
		'Day of week': str().hint('e.g. Monday'),
		Year: str(),
		Month: str().hint('e.g. January'),
		'Day of month': str().hint('Two digits'),
		Hour: str().hint('Two digits, 24-hour clock'),
		Minute: str(),
		Second: str(),
		Timezone: str(),
	}),
	native: { type: 'n8n-nodes-base.scheduleTrigger', version: 1.4, on: 'schedule' },
});
