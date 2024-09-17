export const truncate = (text: string, length?: number = 30): string =>
	text.length > length ? text.slice(0, length).trim() + '...' : text;
