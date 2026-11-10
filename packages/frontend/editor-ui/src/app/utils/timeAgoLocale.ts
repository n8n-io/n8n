import { i18n } from '@n8n/i18n';
import { register } from 'timeago.js';

// index: position in the timeago.js locale table; each row is [past, future]
function localeFunc(_number: number, index: number): [string, string] {
	return [
		[i18n.baseText('timeAgo.justNow'), i18n.baseText('timeAgo.rightNow')],
		[i18n.baseText('timeAgo.justNow'), i18n.baseText('timeAgo.rightNow')], // ['%s seconds ago', 'in %s seconds'],
		[i18n.baseText('timeAgo.oneMinuteAgo'), i18n.baseText('timeAgo.inOneMinute')],
		[i18n.baseText('timeAgo.minutesAgo'), i18n.baseText('timeAgo.inMinutes')],
		[i18n.baseText('timeAgo.oneHourAgo'), i18n.baseText('timeAgo.inOneHour')],
		[i18n.baseText('timeAgo.hoursAgo'), i18n.baseText('timeAgo.inHours')],
		[i18n.baseText('timeAgo.oneDayAgo'), i18n.baseText('timeAgo.inOneDay')],
		[i18n.baseText('timeAgo.daysAgo'), i18n.baseText('timeAgo.inDays')],
		[i18n.baseText('timeAgo.oneWeekAgo'), i18n.baseText('timeAgo.inOneWeek')],
		[i18n.baseText('timeAgo.weeksAgo'), i18n.baseText('timeAgo.inWeeks')],
		[i18n.baseText('timeAgo.oneMonthAgo'), i18n.baseText('timeAgo.inOneMonth')],
		[i18n.baseText('timeAgo.monthsAgo'), i18n.baseText('timeAgo.inMonths')],
		[i18n.baseText('timeAgo.oneYearAgo'), i18n.baseText('timeAgo.inOneYear')],
		[i18n.baseText('timeAgo.yearsAgo'), i18n.baseText('timeAgo.inYears')],
	][index] as [string, string];
}

/** Register the app's translated strings as the timeago.js locale that `N8nTimeAgo` formats with. */
export function registerTimeAgoLocale(locale: string) {
	register(locale, localeFunc);
}
