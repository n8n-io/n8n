import { IValidator, RuleGroup, Validatable } from '../../types';

export const emailRegex =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const requiredValidator: IValidator<{}> = {
	validate: (value: Validatable) => {
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
};

export const minLengthValidator: IValidator<{ minimum: number }> = {
	validate: (value: Validatable, config: { minimum: number }) => {
		if (typeof value === 'string' && value.length < config.minimum) {
			return {
				messageKey: 'formInput.validator.minCharactersRequired',
				options: config,
			};
		}

		return false;
	},
};

export const maxLengthValidator: IValidator<{ maximum: number }> = {
	validate: (value: Validatable, config: { maximum: number }) => {
		if (typeof value === 'string' && value.length > config.maximum) {
			return {
				messageKey: 'formInput.validator.maxCharactersRequired',
				options: config,
			};
		}

		return false;
	},
};

export const containsNumberValidator: IValidator<{ minimum: number }> = {
	validate: (value: Validatable, config: { minimum: number }) => {
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
};

export const emailValidator: IValidator<{}> = {
	validate: (value: Validatable) => {
		if (!emailRegex.test(String(value).trim().toLowerCase())) {
			return {
				messageKey: 'formInput.validator.validEmailRequired',
			};
		}

		return false;
	},
};

export const containsUpperCaseValidator: IValidator<{ minimum: number }> = {
	validate: (value: Validatable, config: { minimum: number }) => {
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
};

export const defaultPasswordRules: RuleGroup = {
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
		{ name: 'MAX_LENGTH', config: { maximum: 64 } },
	],
};

export const VALIDATORS = {
	REQUIRED: requiredValidator,
	MIN_LENGTH: minLengthValidator,
	MAX_LENGTH: maxLengthValidator,
	CONTAINS_NUMBER: containsNumberValidator,
	VALID_EMAIL: emailValidator,
	CONTAINS_UPPERCASE: containsUpperCaseValidator,
	DEFAULT_PASSWORD_RULES: defaultPasswordRules,
};

export const getValidationError = <T extends Validatable, C>(
	value: T,
	validators: { [key: string]: IValidator | RuleGroup },
	validator: IValidator | RuleGroup,
	config?: C,
): ReturnType<IValidator['validate']> => {
	if (validator.hasOwnProperty('rules')) {
		const rules = (validator as RuleGroup).rules;
		for (let i = 0; i < rules.length; i++) {
			if (rules[i].hasOwnProperty('rules')) {
				const error = getValidationError(value, validators, rules[i] as RuleGroup, config);

				if (error) {
					return error;
				}
			}

			if (rules[i].hasOwnProperty('name')) {
				const rule = rules[i] as { name: string; config?: C };
				if (!validators[rule.name]) {
					continue;
				}

				const error = getValidationError(
					value,
					validators,
					validators[rule.name] as IValidator,
					rule.config,
				);
				if (error && 'defaultError' in validator && validator.defaultError) {
					return validator.defaultError;
				} else if (error) {
					return error;
				}
			}
		}
	} else if (validator.hasOwnProperty('validate')) {
		return (validator as IValidator).validate(value, config);
	}

	return false;
};
