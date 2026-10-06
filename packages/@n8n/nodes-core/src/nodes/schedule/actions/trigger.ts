import { t } from '@n8n/node-sdk';

import { schedule } from '../schedule.node';

const hour = t
	.int()
	.with({ minimum: 0, maximum: 23 })
	.optional()
	.title('Trigger at Hour')
	.hint('0-23; a random hour when not set');
const minute = t
	.int()
	.with({ minimum: 0, maximum: 59 })
	.optional()
	.title('Trigger at Minute')
	.hint('0-59; a random minute when not set, so set 0 for on the hour');
const every = (unit: string, fallback: number) =>
	t
		.int()
		.with({ minimum: 1 })
		.default(fallback)
		.title(`${unit.charAt(0).toUpperCase()}${unit.slice(1)} Between Triggers`)
		.hint(`Every n ${unit}`);

/** The Schedule Trigger node, version 1.4. Times are in the workflow timezone. */
export const scheduleTrigger = schedule.trigger('trigger', {
	trigger: 'On schedule',
	summary: 'Starts the workflow at the times of each rule, in the workflow timezone.',
	input: {
		rule: t
			.obj({
				interval: t
					.arr(
						t.variant('field', {
							seconds: { secondsInterval: every('seconds', 30) },
							minutes: { minutesInterval: every('minutes', 5) },
							hours: { hoursInterval: every('hours', 1), triggerAtMinute: minute },
							days: {
								daysInterval: every('days', 1),
								triggerAtHour: hour,
								triggerAtMinute: minute,
							},
							weeks: {
								weeksInterval: every('weeks', 1),
								triggerAtDay: t
									.arr(t.int().with({ enum: [0, 1, 2, 3, 4, 5, 6] }))
									.default([0])
									.title('Trigger on Weekdays')
									.hint('Weekdays: 0 Sunday, 1 Monday, … 6 Saturday'),
								triggerAtHour: hour,
								triggerAtMinute: minute,
							},
							months: {
								monthsInterval: every('months', 1),
								triggerAtDayOfMonth: t
									.int()
									.with({ minimum: 1, maximum: 31 })
									.optional()
									.title('Trigger at Day of Month')
									.hint('1-31; a random day 1-28 when not set'),
								triggerAtHour: hour,
								triggerAtMinute: minute,
							},
							cronExpression: {
								expression: t
									.str()
									.title('Expression')
									.hint('[Second] Minute Hour Day-of-month Month Day-of-week'),
							},
						}),
					)
					.with({ minItems: 1 })
					.title('Trigger Interval')
					.hint('Each rule runs on its own, e.g. daily at 8 and Fridays at 17'),
			})
			.title('Trigger Rules'),
		misfirePolicy: t
			.oneOf('coalesce', 'coalesce_owner', 'skip')
			.optional()
			.title('If Execution Is Missed')
			.hint('A run that n8n missed: skip it, or run the newest one'),
	},
	output: t.obj({
		timestamp: t.str().hint('ISO time of the run in the workflow timezone'),
		'Readable date': t.str(),
		'Readable time': t.str(),
		'Day of week': t.str().hint('e.g. Monday'),
		Year: t.str(),
		Month: t.str().hint('e.g. January'),
		'Day of month': t.str().hint('Two digits'),
		Hour: t.str().hint('Two digits, 24-hour clock'),
		Minute: t.str(),
		Second: t.str(),
		Timezone: t.str(),
	}),
	native: { type: 'n8n-nodes-base.scheduleTrigger', version: 1.4, on: 'schedule' },
});
