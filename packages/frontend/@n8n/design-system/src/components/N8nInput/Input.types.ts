export type InputType = 'text' | 'textarea' | 'password' | 'number' | 'email';
export type InputSize = 'xlarge' | 'large' | 'medium' | 'small' | 'mini';
export type InputAutocomplete =
	| 'off'
	| 'on'
	| 'new-password'
	| 'current-password'
	| 'given-name'
	| 'family-name'
	| 'one-time-code'
	| 'email';

export interface InputProps {
	modelValue?: string | number | null;
	type?: InputType;
	size?: InputSize;
	placeholder?: string;
	disabled?: boolean;
	readonly?: boolean;
	clearable?: boolean;
	rows?: number;
	maxlength?: number;
	autosize?: boolean | { minRows?: number; maxRows?: number };
	autofocus?: boolean;
	autocomplete?: InputAutocomplete;
	name?: string;
}

export interface InputEmits {
	'update:modelValue': [value: string];
	input: [value: string];
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
	keydown: [event: KeyboardEvent];
	mousedown: [event: MouseEvent];
}

export interface InputSlots {
	prefix?: () => unknown;
	suffix?: () => unknown;
	prepend?: () => unknown;
	append?: () => unknown;
}
