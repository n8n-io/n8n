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
