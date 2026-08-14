import dateformat from 'dateformat';

export function generateVersionLabel(versionId: string): string {
	return `Version ${versionId.substring(0, 8)}`;
}

export function formatTimestamp(value: string): { date: string; time: string } {
	const currentYear = new Date().getFullYear().toString();
	const [date, time] = dateformat(
		value,
		`${value.startsWith(currentYear) ? '' : 'yyyy '}mmm d"#"HH:MM:ss`,
	).split('#');

	return { date, time };
}
