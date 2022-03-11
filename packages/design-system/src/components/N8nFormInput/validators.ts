
import { IValidator, RuleGroup } from "../../../../editor-ui/src/Interface";

export const emailRegex =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const VALIDATORS: { [key: string]: IValidator | RuleGroup } = {
	REQUIRED: {
		validate: (value: string | number | boolean | null | undefined) => {
			if (typeof value === 'string' && !!value.trim()) {
				return false;
			}

			if (typeof value === 'number' || typeof value === 'boolean') {
				return false;
			}

			return {
				messageKey: 'formInput.validator.fieldRequired',
			};
		},
	},
	MIN_LENGTH: {
		validate: (value:  string | number | boolean | null | undefined, config: { minimum: number }) => {
			if (typeof value === 'string' && value.length < config.minimum) {
				return {
					messageKey: 'formInput.validator.minCharactersRequired',
					options: config,
				};
			}

			return false;
		},
	},
	MAX_LENGTH: {
		validate: (value:  string | number | boolean | null | undefined, config: { maximum: number }) => {
			if (typeof value === 'string' && value.length > config.maximum) {
				return {
					messageKey: 'formInput.validator.maxCharactersRequired',
					options: config,
				};
			}

			return false;
		},
	},
	CONTAINS_NUMBER: {
		validate: (value:  string | number | boolean | null | undefined, config: { minimum: number }) => {
			if (typeof value !== 'string') {
				return false;
			}

			const numberCount = (value.match(/\d/g) || []).length;
			if (numberCount < config.minimum) {
				return {
					messageKey: 'formInput.validator.numbersRequired',
					options: config,
				};
			}

			return false;
		},
	},
	VALID_EMAIL: {
		validate: (value:  string | number | boolean | null | undefined) => {
			if (!emailRegex.test(String(value).trim().toLowerCase())) {
				return {
					messageKey: 'formInput.validator.validEmailRequired',
				};
			}

			return false;
		},
	},
	CONTAINS_UPPERCASE: {
		validate: (value:  string | number | boolean | null | undefined, config: { minimum: number }) => {
			if (typeof value !== 'string') {
				return false;
			}

			const uppercaseCount = (value.match(/[A-Z]/g) || []).length;
			if (uppercaseCount < config.minimum) {
				return {
					messageKey: 'formInput.validator.uppercaseCharsRequired',
					options: config,
				};
			}

			return false;
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
				defaultError: {
					messageKey: 'formInput.validator.defaultPasswordRequirements',
				},
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
): ReturnType<IValidator['validate']> => {
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
				if (error && (validator as RuleGroup).defaultError !== undefined) {
					// @ts-ignore
					return validator.defaultError;
				} else if (error) {
					return error;
				}
			}
		}
	} else if (
		validator.hasOwnProperty('validate')
	) {
		return (validator as IValidator).validate(value, config);
	}

	return false;
};
