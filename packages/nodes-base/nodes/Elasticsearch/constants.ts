export const WATCH_CHECK_SCHEDULES = ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'interval', 'cron'] as const;

export const MONTHS_OF_THE_YEAR = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

export const DAYS_OF_THE_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const HOURS_PER_DAY = [...new Array(24).keys()].map(n => n.toString());

export const DAYS_PER_MONTH = [...new Array(31).keys()].map(n => n.toString());

export const MINUTES_PER_HOUR = [...new Array(60).keys()].map(n => n.toString());
