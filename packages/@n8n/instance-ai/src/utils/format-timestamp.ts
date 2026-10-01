/** Format an ISO timestamp to match the app's display style (e.g. "Mar 19, 2026 14:30:00"). */
export function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	const datePart = date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
	});
	const timePart = date.toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
	return `${datePart} ${timePart}`;
}
