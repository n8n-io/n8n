export type Rule = { name: string; config?: unknown };

export type RuleGroup = {
	rules: Array<Rule | RuleGroup>;
	defaultError?: { messageKey: string; options?: unknown };
};

export type Validatable = string | number | boolean | null | undefined;

export type IValidator<T = unknown> = {
	validate: (
		value: Validatable,
		config: T,
	) => false | { messageKey: string; message?: string; options?: unknown } | null;
};

export type FormState = {
	isTyping: boolean;
	hasBlutted: boolean;
};

export type IFormInput = {
	name: string;
	initialValue?: string | number | boolean | null;
	properties: {
		label?: string;
		type?:
			| 'text'
			| 'email'
			| 'password'
			| 'select'
			| 'multi-select'
			| 'number'
			| 'info'
			| 'checkbox'
			| 'toggle';
		maxlength?: number;
		required?: boolean;
		showRequiredAsterisk?: boolean;
		validators?: {
			[name: string]: IValidator;
		};
		validationRules?: Array<Rule | RuleGroup>;
		validateOnBlur?: boolean;
		infoText?: string;
		placeholder?: string;
		options?: Array<{ label: string; value: string; disabled?: boolean }>;
		autocomplete?:
			| 'off'
			| 'new-password'
			| 'current-password'
			| 'given-name'
			| 'family-name'
			| 'email'; // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
		capitalize?: boolean;
		focusInitially?: boolean;
		disabled?: boolean;
		labelSize?: 'small' | 'medium' | 'large';
		labelAlignment?: 'left' | 'right' | 'center';
		tooltipText?: string;
	};
	shouldDisplay?: (values: { [key: string]: unknown }) => boolean;
};

export type IFormInputs = IFormInput[];

export type IFormBoxConfig = {
	title: string;
	buttonText?: string;
	secondaryButtonText?: string;
	inputs: IFormInputs;
	redirectLink?: string;
	redirectText?: string;
};
