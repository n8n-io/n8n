export type Model = 'rgb' | 'hsl' | 'hwb';

export type ColorString = {
	get: {
		(color: string): {model: Model; value: number[]} | null;
		rgb: (color: string) => number[] | null;
		hsl: (color: string) => number[] | null;
		hwb: (color: string) => number[] | null;
	};
	to: {
		hex: (r: number, g: number, b: number, a?: number) => string | null;
		rgb: {
			(r: number, g: number, b: number, a?: number): string | null;
			percent: (r: number, g: number, b: number, a?: number) => string | null;
		};
		keyword: (r: number, g: number, b: number, a?: number) => string | null;
		hsl: (h: number, s: number, l: number, a?: number) => string | null;
		hwb: (h: number, w: number, b: number, a?: number) => string | null;
	};
};

declare const colorString: ColorString;
export default colorString;
