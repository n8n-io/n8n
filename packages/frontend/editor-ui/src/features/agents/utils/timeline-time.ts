import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

export function formatTimelineTime(timestamp: number): string {
	if (!timestamp) return '';
	return convertToDisplayDate(new Date(timestamp).toISOString()).time;
}

/** The date and time of a session, such as its last update in the session picker. */
export function formatSessionDateTime(fullDate: string): string {
	if (!fullDate) return '';
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}
