import dateformat from 'dateformat';
import { i18n } from '@n8n/i18n';

export const convertToDisplayDateComponents = (
	fullDate: Date | string | number,
): { date: string; time: string } => {
	const mask = `d mmm${
		new Date(fullDate).getFullYear() === new Date().getFullYear() ? '' : ', yyyy'
	}#HH:MM:ss`;
	const formattedDate = dateformat(fullDate, mask);
	const [date, time] = formattedDate.split('#');
	return { date, time };
};

export function convertToDisplayDate(fullDate: Date | string | number): {
	date: string;
	time: string;
} {
	const mask = `mmm d${
		new Date(fullDate).getFullYear() === new Date().getFullYear() ? '' : ', yyyy'
	}#HH:MM:ss`;
	const formattedDate = dateformat(fullDate, mask);
	const [date, time] = formattedDate.split('#');
	return { date, time };
}

export const toDayMonth = (fullDate: Date | string) => dateformat(fullDate, 'd mmm');

export const toTime = (fullDate: Date | string, includeMillis: boolean = false) =>
	dateformat(fullDate, includeMillis ? 'HH:MM:ss.l' : 'HH:MM:ss');

export const formatTimeAgo = (fullDate: Date | string): string => {
	const now = new Date();
	const date = new Date(fullDate);
	const diffInMs = now.getTime() - date.getTime();
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (diffInDays === 0) {
		return i18n.baseText('userActivity.today');
	} else if (diffInDays === 1) {
		return i18n.baseText('userActivity.yesterday');
	} else if (diffInDays >= 2 && diffInDays <= 6) {
		return dateformat(date, 'dddd');
	} else if (diffInDays >= 7 && diffInDays <= 13) {
		return i18n.baseText('userActivity.lastTime', {
			interpolate: { time: dateformat(date, 'dddd') },
		});
	} else if (diffInDays >= 14 && diffInDays <= 30) {
		return i18n.baseText('userActivity.daysAgo', { interpolate: { count: diffInDays.toString() } });
	} else {
		return dateformat(date, 'mmmm d, yyyy');
	}
};

/**
 * Format a date for UI display, with optional IANA timezone.
 * If timeZone is provided we'll use Intl.DateTimeFormat to ensure the displayed time
 * matches that timezone (e.g. 'Asia/Beirut'). If not provided, we fall back to the
 * existing `dateformat` behaviour so other parts of the app are unaffected.
 *
 * @param fullDate Date | string | number
 * @param timeZone optional IANA timezone e.g. 'Asia/Beirut'
 * @param locale optional locale string e.g. 'en-US'
 * @returns { date: string, time: string } similar to convertToDisplayDateComponents
 */
export const formatDateForUI = (
	fullDate: Date | string | number | null | undefined,
	timeZone?: string,
	locale?: string,
): { date: string; time: string } => {
	if (fullDate === null || fullDate === undefined || fullDate === '') {
		return { date: '', time: '' };
	}

	const d = new Date(fullDate as any);
	if (Number.isNaN(d.getTime())) {
		return { date: 'Invalid Date', time: '' };
	}

	// If timezone is provided, use Intl.DateTimeFormat for consistent TZ-aware formatting
	if (timeZone) {
		try {
			// date part (short month + day [+ year if not current year])
			const includeYear = d.getFullYear() !== new Date().getFullYear();
			const dateOpts: Intl.DateTimeFormatOptions = {
				year: includeYear ? 'numeric' : undefined,
				month: 'short',
				day: 'numeric',
			};

			// time part (hour & minute, 12-hour with AM/PM)
			const timeOpts: Intl.DateTimeFormatOptions = {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
			};

			const dateStr = new Intl.DateTimeFormat(locale ?? undefined, {
				...dateOpts,
				timeZone,
			}).format(d);

			const timeStr = new Intl.DateTimeFormat(locale ?? undefined, {
				...timeOpts,
				timeZone,
			}).format(d);

			return { date: dateStr, time: timeStr };
		} catch (err) {
			// fall through to fallback formatting if Intl fails for any reason
		}
	}

	// Fallback: reuse existing dateformat masks (keeps previous behaviours intact)
	const mask = `mmm d${d.getFullYear() === new Date().getFullYear() ? '' : ', yyyy'}#HH:MM:ss`;
	const formattedDate = dateformat(d, mask);
	const [date, time] = formattedDate.split('#');
	return { date, time };
};
