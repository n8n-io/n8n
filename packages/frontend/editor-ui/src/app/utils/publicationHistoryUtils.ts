/** Match the duration labels in workflow and Agent publication timelines. */
export function formatPublicationDuration(start: Date, end: Date): string {
	const seconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) {
		const remainder = minutes % 60;
		return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
	}
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
}
