export interface RadioOption<Value extends string | boolean> {
	label: string;
	value: Value;
	disabled?: boolean;
	data?: Record<string, string | number | boolean | undefined>;
}

export interface RadioButtonsProps<Value extends string | boolean> {
	modelValue?: Value;
	options?: Array<RadioOption<Value>>;
	/** @default medium */
	size?: 'small' | 'small-medium' | 'medium';
	disabled?: boolean;
	squareButtons?: boolean;
}
