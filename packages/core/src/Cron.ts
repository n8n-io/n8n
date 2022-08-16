interface BaseTriggerTime<T extends string> {
	mode: T;
}

type CronExpression = string;
interface CustomTrigger extends BaseTriggerTime<'custom'> {
	cronExpression: CronExpression;
}

interface EveryXTrigger<U extends string> extends BaseTriggerTime<'everyX'> {
	unit: U;
	value: number;
}

type EveryMinuteTrigger = BaseTriggerTime<'everyMinute'>;
type EveryXMinutesTrigger = EveryXTrigger<'minutes'>;

interface EveryHourTrigger extends BaseTriggerTime<'everyHour'> {
	minute: number; // 0 - 59
}
type EveryXHoursTrigger = EveryXTrigger<'hours'>;

interface EveryDayTrigger extends BaseTriggerTime<'everyDay'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
}

interface EveryWeekTrigger extends BaseTriggerTime<'everyWeek'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
	weekday: number; // 0 - 6(Sun - Sat)
}

interface EveryMonthTrigger extends BaseTriggerTime<'everyMonth'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
	dayOfMonth: number; // 1 - 31
}

export type TriggerTime =
	| CustomTrigger
	| EveryMinuteTrigger
	| EveryXMinutesTrigger
	| EveryHourTrigger
	| EveryXHoursTrigger
	| EveryDayTrigger
	| EveryWeekTrigger
	| EveryMonthTrigger;

const randomSecond = () => Math.floor(Math.random() * 60).toString();

export const triggerToCronExpression = (item: TriggerTime): CronExpression => {
	if (item.mode === 'everyMinute') return `${randomSecond()} * * * * *`;
	if (item.mode === 'everyHour') return `${randomSecond()} ${item.minute} * * * *`;

	if (item.mode === 'everyX') {
		if (item.unit === 'minutes') return `${randomSecond()} */${item.value} * * * *`;
		if (item.unit === 'hours') return `${randomSecond()} 0 */${item.value} * * *`;
	}
	if (item.mode === 'everyDay') return `${randomSecond()} ${item.minute} ${item.hour} * * *`;
	if (item.mode === 'everyWeek')
		return `${randomSecond()} ${item.minute} ${item.hour} * * ${item.weekday}`;

	if (item.mode === 'everyMonth')
		return `${randomSecond()} ${item.minute} ${item.hour} ${item.dayOfMonth} * *`;

	return item.cronExpression.trim();
};
