export type Input2Type = 'text' | 'textarea' | 'password';
export type Input2Size = 'xlarge' | 'large' | 'medium' | 'small' | 'mini';

export interface InputProps {
	modelValue?: string | number | null;
	type?: Input2Type;
	size?: Input2Size;
	placeholder?: string;
	disabled?: boolean;
	clearable?: boolean;
	rows?: number;
	maxlength?: number;
	autosize?: boolean | { minRows?: number; maxRows?: number };
	autofocus?: boolean;
	autocomplete?: 'on' | 'off';
}

export interface InputEmits {
	'update:modelValue': [value: string | number | null];
	blur: [event: FocusEvent];
	keydown: [event: KeyboardEvent];
}

export interface InputSlots {
	prefix?: () => unknown;
	suffix?: () => unknown;
}
