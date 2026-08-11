import { useI18n } from '@n8n/i18n';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

interface RelativeI18n {
	justNow: string;
	secondsAgo: (n: number) => string;
	minutesAgo: (n: number) => string;
	hoursAgo: (n: number) => string;
	yesterday: string;
}

/**
 * Returns a short, recognisable description of when something happened:
 *
 *   - within 5s   → "just now"
 *   - within 1m   → "Ns ago"
 *   - within 1h   → "Nm ago"
 *   - within 24h  → "Nh ago"
 *   - calendar day = previous local day → "Yesterday"
 *   - older       → short locale date, e.g. "Oct 3" / "3 Oct"
 *
 * The shared `app/components/TimeAgo.vue` (timeago.js-based) also exists, but
 * it walks the full seconds→years ladder with no "Yesterday" step and never
 * falls back to an absolute date — wrong shape for a chat-history list where
 * old sessions should drop to a date so the dropdown stays scannable.
 */
export function formatRelativeTimestamp(
	date: Date | string | number,
	i18n: RelativeI18n,
	now: Date = new Date(),
): string {
	const past = date instanceof Date ? date : new Date(date);
	const diff = now.getTime() - past.getTime();

	// Future timestamps are unusual here — clamp to "just now" rather than
	// rendering a confusing "in 3 hours" label.
	if (diff < 5 * SECOND) return i18n.justNow;
	if (diff < MINUTE) return i18n.secondsAgo(Math.floor(diff / SECOND));
	if (diff < HOUR) return i18n.minutesAgo(Math.floor(diff / MINUTE));

	// Hour granularity stays inside the same local calendar day. Once the
	// timestamp falls into a previous day, we switch to "Yesterday" or a date
	// — saying "20h ago" when a user expects "Yesterday" is jarring.
	if (isSameLocalDay(past, now)) return i18n.hoursAgo(Math.floor(diff / HOUR));
	if (isYesterdayLocal(past, now)) return i18n.yesterday;

	// Use the user's locale so dates render the way they expect (Oct 3 vs 3 Oct).
	return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isSameLocalDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function isYesterdayLocal(past: Date, now: Date): boolean {
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	return isSameLocalDay(past, yesterday);
}

export function useRelativeTimestamp() {
	const i18n = useI18n();
	const strings: RelativeI18n = {
		justNow: i18n.baseText('agents.relativeTime.justNow'),
		secondsAgo: (n) =>
			i18n.baseText('agents.relativeTime.secondsAgo', { interpolate: { count: String(n) } }),
		minutesAgo: (n) =>
			i18n.baseText('agents.relativeTime.minutesAgo', { interpolate: { count: String(n) } }),
		hoursAgo: (n) =>
			i18n.baseText('agents.relativeTime.hoursAgo', { interpolate: { count: String(n) } }),
		yesterday: i18n.baseText('agents.relativeTime.yesterday'),
	};
	return (date: Date | string | number) => formatRelativeTimestamp(date, strings);
}
