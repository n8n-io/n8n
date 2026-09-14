/** Truncate a task description to a short display label (first sentence, max length). */
export function truncateLabel(text: string, maxLen = 100): string {
	const firstLine = text.split(/[.\n]/)[0].trim();
	return firstLine.length <= maxLen ? firstLine : firstLine.slice(0, maxLen) + '…';
}
