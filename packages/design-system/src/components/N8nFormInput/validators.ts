
import { IValidator, RuleGroup } from "../../../../editor-ui/src/Interface";

export const emailRegex =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const VALIDATORS: { [key: string]: IValidator | RuleGroup } = {
	REQUIRED: {
		validate: (value: string | number | boolean | null | undefined) => {
			if (typeof value === 'string' && !!value.trim()) {
				return;
			}

			if (typeof value === 'number' || typeof value === 'boolean') {
				return;
			}
			throw new Error('This field is required');
		},
	},
	MIN_LENGTH: {
		validate: (value: string, config: { minimum: number }) => {
			if (value.length < config.minimum) {
				throw new Error(`Must be at least ${config.minimum} characters`);
			}
		},
	},
	MAX_LENGTH: {
		validate: (value: string, config: { maximum: number }) => {
			if (value.length > config.maximum) {
			 throw new Error(`Must be at most ${config.maximum} characters`);
			}
		},
	},
	CONTAINS_NUMBER: {
		validate: (value: string, config: { minimum: number }) => {
			const numberCount = (value.match(/\d/g) || []).length;

			if (numberCount < config.minimum) {
				throw new Error(`Must have at least ${config.minimum} number${config.minimum > 1 ? 's' : ''}`);
			}
		},
	},
	VALID_EMAIL: {
		validate: (value: string) => {
			if (!emailRegex.test(String(value).trim().toLowerCase())) {
				throw new Error('Must be a valid email');
			}
		},
	},
	CONTAINS_UPPERCASE: {
		validate: (value: string, config: { minimum: number }) => {
			const uppercaseCount = (value.match(/[A-Z]/g) || []).length;

			if (uppercaseCount < config.minimum) {
				throw new Error(`Must have at least ${config.minimum} uppercase character${
					config.minimum > 1 ? 's' : ''
				}`);
			}
		},
	},
	DEFAULT_PASSWORD_RULES: {
		rules: [
			{
				rules: [
					{ name: 'MIN_LENGTH', config: { minimum: 8 } },
					{ name: 'CONTAINS_NUMBER', config: { minimum: 1 } },
					{ name: 'CONTAINS_UPPERCASE', config: { minimum: 1 } },
				],
				defaultError: 'At least 8 characters with 1 number and 1 uppercase',
			},
			{ name: 'MAX_LENGTH', config: {maximum: 64} },
		],
	},
};

export const getValidationError = (
	value: any, // tslint:disable-line:no-any
	validators: { [key: string]: IValidator | RuleGroup },
	validator: IValidator | RuleGroup,
	config?: any, // tslint:disable-line:no-any
): string | null => {
	if (validator.hasOwnProperty('rules')) {
		const rules = (validator as RuleGroup).rules;
		for (let i = 0; i < rules.length; i++) {
			if (rules[i].hasOwnProperty('rules')) {
				const error = getValidationError(
					value,
					validators,
					rules[i] as RuleGroup,
					config,
				);

				if (error) {
					return error;
				}
			}

			if (rules[i].hasOwnProperty('name') ) {
				const rule = rules[i] as {name: string, config?: any}; // tslint:disable-line:no-any
				if (!validators[rule.name]) {
					continue;
				}

				const error = getValidationError(
					value,
					validators,
					validators[rule.name] as IValidator,
					rule.config,
				);
				if (error) {
					return (validator as RuleGroup).defaultError || error;
				}
			}
		}
	} else if (
		validator.hasOwnProperty('validate')
	) {
		try {
			(validator as IValidator).validate(value, config);
		} catch (e: unknown) {
			if (e instanceof Error) {
				return e.message;
			}
		}
	}

	return null;
};
