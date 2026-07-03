export type RadioGroupProps = {
	modelValue?: string;
	defaultValue?: string;
	disabled?: boolean;
	orientation?: 'vertical' | 'horizontal';
	name?: string;
	required?: boolean;
	loop?: boolean;
	dir?: 'ltr' | 'rtl';
	ariaLabel?: string;
};

export type RadioGroupEmits = {
	'update:modelValue': [value: string];
};

export type RadioGroupSlots = {
	default(): unknown;
};
