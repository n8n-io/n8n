export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/**
 * Fixture timestamps are fixed offsets from the moment the prototype loads,
 * so "2 hours ago" stays true whenever a reviewer opens the link, and events
 * made during the session sort after the seeded ones.
 */
export const NOW = Date.now();

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'} ago`;

/** "Just now", "5 minutes ago", "2 days ago", then the date. */
export function formatRelative(timestamp: number, now = Date.now()): string {
	const elapsed = Math.max(0, now - timestamp);
	if (elapsed < MINUTE) return 'Just now';
	if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), 'minute');
	if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), 'hour');
	if (elapsed < 14 * DAY) return plural(Math.floor(elapsed / DAY), 'day');
	if (elapsed < 60 * DAY) return plural(Math.floor(elapsed / (7 * DAY)), 'week');
	return formatDate(timestamp);
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const dateWithYearFormat = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-US', {
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

/** "Nov 18", with the year when it isn't this one. */
export function formatDate(timestamp: number): string {
	const sameYear = new Date(timestamp).getFullYear() === new Date(NOW).getFullYear();
	return (sameYear ? dateFormat : dateWithYearFormat).format(timestamp);
}

/** "Nov 18, 13:34": US date, 24-hour time. */
export function formatDateTime(timestamp: number): string {
	return `${formatDate(timestamp)}, ${timeFormat.format(timestamp)}`;
}

/** "0.4s", "12s", "3m 5s". */
export function formatDuration(milliseconds: number): string {
	if (milliseconds < 1000) return `${(milliseconds / 1000).toFixed(1)}s`;
	const seconds = Math.round(milliseconds / 1000);
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

const numberFormat = new Intl.NumberFormat('en-US');

/** "23,456". */
export function formatNumber(value: number): string {
	return numberFormat.format(value);
}
