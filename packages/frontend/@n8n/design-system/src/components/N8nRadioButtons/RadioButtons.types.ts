/**
 * Extracted from the SFC: `<script setup>` types that reference the component's
 * generic parameter cannot be exported in place — the export hoists them above
 * the generic's scope. Left unexported they are private names in the emitted
 * declaration, which publishes no prop names (TS4082).
 */
export interface RadioOption<Value extends string | boolean = string | boolean> {
	label: string;
	value: Value;
	disabled?: boolean;
	data?: Record<string, string | number | boolean | undefined>;
}

export interface RadioButtonsProps<Value extends string | boolean = string | boolean> {
	modelValue?: Value;
	options?: Array<RadioOption<Value>>;
	/** @default medium */
	size?: 'small' | 'small-medium' | 'medium';
	disabled?: boolean;
	squareButtons?: boolean;
}
