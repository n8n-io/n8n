import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

export function formatTimelineTime(timestamp: number): string {
	if (!timestamp) return '';
	return convertToDisplayDate(new Date(timestamp).toISOString()).time;
}
