/**
 * Returns where `text` must continue in a new message, so that a message that
 * already holds `used` characters stays within `max`. Near the limit it breaks
 * after a line, so messages end on whole lines when it can. It cuts text
 * mid-line only when the text does not fit in an empty message.
 */
export function messageBreak(used: number, text: string, max: number): number | undefined {
	if (used + text.length <= max * 0.9) return undefined;
	const room = max - used;
	if (room <= 0) return 0;
	const lineEnd = text.lastIndexOf('\n', room - 1);
	if (lineEnd !== -1) return lineEnd + 1;
	if (text.length <= room) return undefined;
	if (used > 0) return 0;
	// Keep both halves of a surrogate pair, such as an emoji, in one message.
	const code = text.charCodeAt(room - 1);
	return code >= 0xd800 && code <= 0xdbff ? room - 1 : room;
}

/** Splits text into messages of at most `max` characters. */
export function splitMessage(text: string, max: number): string[] {
	const parts: string[] = [];
	let rest = text;
	while (rest.length > max) {
		const breakAt = messageBreak(0, rest, max) ?? max;
		parts.push(rest.slice(0, breakAt));
		rest = rest.slice(breakAt);
	}
	parts.push(rest);
	return parts.filter((part) => part.trim());
}
