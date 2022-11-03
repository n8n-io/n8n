export type Rule = { name: string; config?: any}; // tslint:disable-line:no-any

export type RuleGroup = {
	rules: Array<Rule | RuleGroup>;
	defaultError?: {messageKey: string, options?: any}; // tslint:disable-line:no-any
};

export type IValidator = {
	validate: (value: string | number | boolean | null | undefined, config: any) => false | {messageKey: string, options?: any} | null; // tslint:disable-line:no-any
};


export type IFormInput = {
	name: string;
	initialValue?: string | number | boolean | null;
	properties: {
		label?: string;
		type?: 'text' | 'email' | 'password' | 'select' | 'multi-select' | 'info'| 'checkbox';
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
		options?: Array<{label: string; value: string}>;
		autocomplete?: 'off' | 'new-password' | 'current-password' | 'given-name' | 'family-name' | 'email'; // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
		capitalize?: boolean;
		focusInitially?: boolean;
	};
	shouldDisplay?: (values: {[key: string]: unknown}) => boolean;
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
