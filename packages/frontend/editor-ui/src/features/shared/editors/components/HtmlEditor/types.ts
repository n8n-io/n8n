export type Range = [number, number];

export type Section = {
	kind: 'html' | 'script' | 'style';
	content: string;
	range: Range;
};
