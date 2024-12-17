export const truncate = (text: string, length = 30): string =>
	text.length > length ? text.slice(0, length) + '...' : text;
