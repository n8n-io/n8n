export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv';

export type IN8nColorPicker = {
	disabled?: boolean;
	size?: 'small' | 'medium' | 'mini';
	showAlpha?: boolean;
	colorFormat?: ColorFormat;
	popperClass?: string;
	predefine?: ColorFormat[];
	value: string;
};
