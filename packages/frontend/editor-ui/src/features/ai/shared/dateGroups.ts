export const RELATIVE_DATE_GROUPS = ['Today', 'Yesterday', 'This week', 'Older'] as const;

export type RelativeDateGroup = (typeof RELATIVE_DATE_GROUPS)[number];

export function getRelativeDate(now: Date, dateString: string): RelativeDateGroup {
	const date = new Date(dateString);
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const lastWeek = new Date(today);
	lastWeek.setDate(lastWeek.getDate() - 7);

	const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	if (itemDate.getTime() === today.getTime()) {
		return 'Today';
	} else if (itemDate.getTime() === yesterday.getTime()) {
		return 'Yesterday';
	} else if (itemDate >= lastWeek) {
		return 'This week';
	} else {
		return 'Older';
	}
}
