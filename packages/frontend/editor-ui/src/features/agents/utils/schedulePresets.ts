import { CronTime } from 'cron';

export type ScheduleInputMode = 'preset' | 'custom';

export interface SchedulePreset {
	labelKey: string;
	cronExpression: string;
}

export const schedulePresets: SchedulePreset[] = [
	{
		labelKey: 'agents.schedule.presets.everyHour',
		cronExpression: '0 * * * *',
	},
	{
		labelKey: 'agents.schedule.presets.everyDay',
		cronExpression: '0 9 * * *',
	},
	{
		labelKey: 'agents.schedule.presets.everyWeekday',
		cronExpression: '0 9 * * 1-5',
	},
	{
		labelKey: 'agents.schedule.presets.everyMonday',
		cronExpression: '0 9 * * 1',
	},
];

export function getSchedulePresetByCronExpression(cronExpression: string) {
	return schedulePresets.find((preset) => preset.cronExpression === cronExpression.trim());
}

export function getScheduleInputMode(cronExpression: string): ScheduleInputMode {
	return getSchedulePresetByCronExpression(cronExpression) ? 'preset' : 'custom';
}

export function getNextScheduleOccurrence(cronExpression: string, timezone: string): Date | null {
	if (!cronExpression.trim()) {
		return null;
	}

	try {
		return new CronTime(cronExpression, timezone).sendAt().toJSDate();
	} catch {
		return null;
	}
}
