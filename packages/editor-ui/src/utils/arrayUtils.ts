export const range: (start: number, end: number) => number[] = (start, end) =>
	Array.from({ length: end - start }, (_, i) => i + start);
