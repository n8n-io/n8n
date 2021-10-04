export type IRule = { name: string; config?: any;};

export type IRuleSet = (IRule | IRuleGroup)[];

export type IRuleGroup = {
	rules: IRuleSet;
	defaultError?: string;
};

export type IValidator = {
	validate: (value: string, config?: any) => void;
};

export type IFormInputsCol = {
	name: string;
	initialValue?: string | number | boolean | null;
	visible?: (values: {[key: string]: string}) => boolean;
	properties: {
		label: string;
		type?: "text" | "email" | "password" | 'select';
		maxlength?: number;
		required?: boolean;
		validators?: {
			[name: string]: IValidator;
		};
		validationRules?: IValidationRule[];
		infoText?: string;
		placeholder?: string;
		options?: Array<{label: string; value: string}>;
	}
};

export type IFormInputsRow = IFormInputsCol[];

export type IFormInputs = IFormInputsRow[];
