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

export const formatDateForUI = (
	fullDate: Date | string | number | null | undefined,
	timeZone?: string,
	locale?: string,
): { date: string; time: string } => {
	if (fullDate === null || fullDate === undefined || fullDate === '') {
		return { date: '', time: '' };
	}

	// Narrow input first instead of using `as any`
	if (typeof fullDate !== 'string' && typeof fullDate !== 'number' && !(fullDate instanceof Date)) {
		return { date: 'Invalid Date', time: '' };
	}

	const d = new Date(fullDate);

	if (Number.isNaN(d.getTime())) {
		return { date: 'Invalid Date', time: '' };
	}

	// Helper to get year in a timezone (falls back to local year)
	const getYearInTZ = (date: Date, tz?: string, loc?: string) => {
		if (!tz) return date.getFullYear();
		try {
			const parts = new Intl.DateTimeFormat(loc ?? undefined, {
				timeZone: tz,
				year: 'numeric',
			}).formatToParts(date);
			const yearStr = parts.find((p) => p.type === 'year')?.value;
			return yearStr ? Number(yearStr) : date.getFullYear();
		} catch {
			// If Intl/timezone fails, fall back to local year
			return date.getFullYear();
		}
	};

	// If timezone provided, produce TZ-aware strings (Intl handles formatting)
	if (timeZone) {
		try {
			// include year if the display year (in target timezone) differs from current year in that same timezone
			const includeYear =
				getYearInTZ(d, timeZone, locale) !== getYearInTZ(new Date(), timeZone, locale);

			const dateOpts: Intl.DateTimeFormatOptions = {
				year: includeYear ? 'numeric' : undefined,
				month: 'short',
				day: 'numeric',
			};

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
			// fall through to fallback below
		}
	}

	// Fallback: keep existing dateformat behaviour
	const mask = `mmm d${d.getFullYear() === new Date().getFullYear() ? '' : ', yyyy'}#HH:MM:ss`;
	const formattedDate = dateformat(d, mask);
	const [date, time] = formattedDate.split('#');
	return { date, time };
};
