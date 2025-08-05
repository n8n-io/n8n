/**
 * Comprehensive test suite for form input validators
 */

import {
	emailRegex,
	requiredValidator,
	minLengthValidator,
	maxLengthValidator,
	containsNumberValidator,
	emailValidator,
	containsUpperCaseValidator,
	matchRegex,
	defaultPasswordRules,
	VALIDATORS,
	getValidationError,
} from '../validators';
import type { IValidator, RuleGroup, Validatable } from '../../../types';

describe('Form Input Validators', () => {
	describe('emailRegex', () => {
		it('should match valid email formats', () => {
			const validEmails = [
				'test@example.com',
				'user123@domain.co.uk',
				'first.last@subdomain.example.org',
				'user+tag@example.com',
				'user_name@example-domain.com',
				'a@b.co',
				'test.email.with+symbol@example.com',
				'user@[192.168.1.1]', // IP address format
				'"test.email"@example.com', // Quoted local part
			];

			validEmails.forEach((email) => {
				expect(emailRegex.test(email)).toBe(true);
			});
		});

		it('should not match invalid email formats', () => {
			const invalidEmails = [
				'invalid-email',
				'@example.com',
				'test@',
				'test..test@example.com',
				'test@example',
				'test @example.com', // Space in local part
				'test@example .com', // Space in domain
				'test@.example.com',
				'test@example..com',
				'',
				'   ',
				'test@example.c', // Single character TLD
			];

			invalidEmails.forEach((email) => {
				expect(emailRegex.test(email)).toBe(false);
			});
		});
	});

	describe('requiredValidator', () => {
		it('should return false for valid string values', () => {
			const validValues = ['test', 'hello world', '123', 'a'];

			validValues.forEach((value) => {
				expect(requiredValidator.validate(value)).toBe(false);
			});
		});

		it('should return false for numeric values', () => {
			const numericValues = [0, 1, -1, 3.14, -3.14, 100];

			numericValues.forEach((value) => {
				expect(requiredValidator.validate(value)).toBe(false);
			});
		});

		it('should return false for boolean values', () => {
			expect(requiredValidator.validate(true)).toBe(false);
			expect(requiredValidator.validate(false)).toBe(false);
		});

		it('should return validation error for empty/invalid values', () => {
			const invalidValues: Validatable[] = ['', '   ', null, undefined];

			invalidValues.forEach((value) => {
				const result = requiredValidator.validate(value);
				expect(result).toEqual({
					messageKey: 'formInput.validator.fieldRequired',
				});
			});
		});

		it('should handle whitespace-only strings correctly', () => {
			const whitespaceValues = ['   ', '\t', '\n', '\r\n', ' \t \n '];

			whitespaceValues.forEach((value) => {
				const result = requiredValidator.validate(value);
				expect(result).toEqual({
					messageKey: 'formInput.validator.fieldRequired',
				});
			});
		});
	});

	describe('minLengthValidator', () => {
		it('should return false for strings meeting minimum length', () => {
			expect(minLengthValidator.validate('hello', { minimum: 5 })).toBe(false);
			expect(minLengthValidator.validate('hello world', { minimum: 5 })).toBe(false);
			expect(minLengthValidator.validate('test', { minimum: 4 })).toBe(false);
		});

		it('should return validation error for strings below minimum length', () => {
			const result = minLengthValidator.validate('hi', { minimum: 5 });
			expect(result).toEqual({
				messageKey: 'formInput.validator.minCharactersRequired',
				options: { minimum: 5 },
			});
		});

		it('should return false for non-string values', () => {
			const nonStringValues: Validatable[] = [123, true, null, undefined];

			nonStringValues.forEach((value) => {
				expect(minLengthValidator.validate(value, { minimum: 5 })).toBe(false);
			});
		});

		it('should handle edge cases correctly', () => {
			expect(minLengthValidator.validate('', { minimum: 1 })).toEqual({
				messageKey: 'formInput.validator.minCharactersRequired',
				options: { minimum: 1 },
			});

			expect(minLengthValidator.validate('a', { minimum: 0 })).toBe(false);
			expect(minLengthValidator.validate('', { minimum: 0 })).toBe(false);
		});
	});

	describe('maxLengthValidator', () => {
		it('should return false for strings within maximum length', () => {
			expect(maxLengthValidator.validate('hello', { maximum: 10 })).toBe(false);
			expect(maxLengthValidator.validate('test', { maximum: 4 })).toBe(false);
			expect(maxLengthValidator.validate('', { maximum: 5 })).toBe(false);
		});

		it('should return validation error for strings exceeding maximum length', () => {
			const result = maxLengthValidator.validate('hello world', { maximum: 5 });
			expect(result).toEqual({
				messageKey: 'formInput.validator.maxCharactersRequired',
				options: { maximum: 5 },
			});
		});

		it('should return false for non-string values', () => {
			const nonStringValues: Validatable[] = [123, true, null, undefined];

			nonStringValues.forEach((value) => {
				expect(maxLengthValidator.validate(value, { maximum: 5 })).toBe(false);
			});
		});

		it('should handle edge cases correctly', () => {
			expect(maxLengthValidator.validate('a', { maximum: 0 })).toEqual({
				messageKey: 'formInput.validator.maxCharactersRequired',
				options: { maximum: 0 },
			});

			expect(maxLengthValidator.validate('', { maximum: 0 })).toBe(false);
		});
	});

	describe('containsNumberValidator', () => {
		it('should return false for strings meeting number requirement', () => {
			expect(containsNumberValidator.validate('test123', { minimum: 1 })).toBe(false);
			expect(containsNumberValidator.validate('a1b2c3', { minimum: 3 })).toBe(false);
			expect(containsNumberValidator.validate('password1', { minimum: 1 })).toBe(false);
		});

		it('should return validation error for strings with insufficient numbers', () => {
			const result = containsNumberValidator.validate('hello', { minimum: 1 });
			expect(result).toEqual({
				messageKey: 'formInput.validator.numbersRequired',
				options: { minimum: 1 },
			});
		});

		it('should return false for non-string values', () => {
			const nonStringValues: Validatable[] = [123, true, null, undefined];

			nonStringValues.forEach((value) => {
				expect(containsNumberValidator.validate(value, { minimum: 1 })).toBe(false);
			});
		});

		it('should handle edge cases correctly', () => {
			expect(containsNumberValidator.validate('', { minimum: 1 })).toEqual({
				messageKey: 'formInput.validator.numbersRequired',
				options: { minimum: 1 },
			});

			expect(containsNumberValidator.validate('abc', { minimum: 0 })).toBe(false);
			expect(containsNumberValidator.validate('123456789', { minimum: 5 })).toBe(false);
		});

		it('should count digits correctly', () => {
			expect(containsNumberValidator.validate('a1b2c3d4e5', { minimum: 5 })).toBe(false);
			expect(containsNumberValidator.validate('a1b2c3d4', { minimum: 5 })).toEqual({
				messageKey: 'formInput.validator.numbersRequired',
				options: { minimum: 5 },
			});
		});
	});

	describe('emailValidator', () => {
		it('should return false for valid email addresses', () => {
			const validEmails = [
				'test@example.com',
				'User@Domain.COM', // Case insensitive
				'  user@example.com  ', // Trimmed
				'user.name@example.co.uk',
			];

			validEmails.forEach((email) => {
				expect(emailValidator.validate(email)).toBe(false);
			});
		});

		it('should return validation error for invalid email addresses', () => {
			const invalidEmails = [
				'invalid-email',
				'@example.com',
				'test@',
				'test..test@example.com',
				'',
				'   ',
			];

			invalidEmails.forEach((email) => {
				const result = emailValidator.validate(email);
				expect(result).toEqual({
					messageKey: 'formInput.validator.validEmailRequired',
				});
			});
		});

		it('should handle non-string values by converting to string', () => {
			expect(emailValidator.validate(123)).toEqual({
				messageKey: 'formInput.validator.validEmailRequired',
			});

			expect(emailValidator.validate(null)).toEqual({
				messageKey: 'formInput.validator.validEmailRequired',
			});

			expect(emailValidator.validate(undefined)).toEqual({
				messageKey: 'formInput.validator.validEmailRequired',
			});
		});
	});

	describe('containsUpperCaseValidator', () => {
		it('should return false for strings meeting uppercase requirement', () => {
			expect(containsUpperCaseValidator.validate('Hello', { minimum: 1 })).toBe(false);
			expect(containsUpperCaseValidator.validate('ABC', { minimum: 3 })).toBe(false);
			expect(containsUpperCaseValidator.validate('TestPASSWORD', { minimum: 2 })).toBe(false);
		});

		it('should return validation error for strings with insufficient uppercase characters', () => {
			const result = containsUpperCaseValidator.validate('hello', { minimum: 1 });
			expect(result).toEqual({
				messageKey: 'formInput.validator.uppercaseCharsRequired',
				options: { minimum: 1 },
			});
		});

		it('should return false for non-string values', () => {
			const nonStringValues: Validatable[] = [123, true, null, undefined];

			nonStringValues.forEach((value) => {
				expect(containsUpperCaseValidator.validate(value, { minimum: 1 })).toBe(false);
			});
		});

		it('should handle edge cases correctly', () => {
			expect(containsUpperCaseValidator.validate('', { minimum: 1 })).toEqual({
				messageKey: 'formInput.validator.uppercaseCharsRequired',
				options: { minimum: 1 },
			});

			expect(containsUpperCaseValidator.validate('abc', { minimum: 0 })).toBe(false);
			expect(containsUpperCaseValidator.validate('ABCDEFGH', { minimum: 5 })).toBe(false);
		});

		it('should count uppercase letters correctly', () => {
			expect(containsUpperCaseValidator.validate('AbCdEfG', { minimum: 4 })).toBe(false);
			expect(containsUpperCaseValidator.validate('AbCd', { minimum: 2 })).toBe(false); // Has 2 uppercase: A, C
			expect(containsUpperCaseValidator.validate('AbC', { minimum: 4 })).toEqual({
				messageKey: 'formInput.validator.uppercaseCharsRequired',
				options: { minimum: 4 },
			});
		});
	});

	describe('matchRegex', () => {
		it('should return false for values matching the regex', () => {
			const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
			const config = { regex: phoneRegex, message: 'Invalid phone format' };

			expect(matchRegex.validate('123-456-7890', config)).toBe(false);
			expect(matchRegex.validate('999-000-1111', config)).toBe(false);
		});

		it('should return validation error for values not matching the regex', () => {
			const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
			const config = { regex: phoneRegex, message: 'Invalid phone format' };

			const result = matchRegex.validate('1234567890', config);
			expect(result).toEqual({
				message: 'Invalid phone format',
				options: config,
			});
		});

		it('should handle different regex patterns', () => {
			const patterns = [
				{ regex: /^[A-Z]+$/, message: 'Only uppercase letters', value: 'ABC', shouldPass: true },
				{ regex: /^[A-Z]+$/, message: 'Only uppercase letters', value: 'abc', shouldPass: false },
				{
					regex: /^\w+@\w+\.\w+$/,
					message: 'Simple email format',
					value: 'test@example.com',
					shouldPass: true,
				},
				{ regex: /^\d{4}$/, message: '4 digits required', value: '1234', shouldPass: true },
				{ regex: /^\d{4}$/, message: '4 digits required', value: '12345', shouldPass: false },
			];

			patterns.forEach(({ regex, message, value, shouldPass }) => {
				const config = { regex, message };
				const result = matchRegex.validate(value, config);

				if (shouldPass) {
					expect(result).toBe(false);
				} else {
					expect(result).toEqual({
						message,
						options: config,
					});
				}
			});
		});

		it('should convert non-string values to string', () => {
			const numberRegex = /^\d+$/;
			const config = { regex: numberRegex, message: 'Numbers only' };

			expect(matchRegex.validate(123, config)).toBe(false);
			expect(matchRegex.validate(null, config)).not.toBe(false); // 'null' string doesn't match
			expect(matchRegex.validate(undefined, config)).not.toBe(false); // 'undefined' string doesn't match
		});
	});

	describe('defaultPasswordRules', () => {
		it('should have correct structure', () => {
			expect(defaultPasswordRules).toHaveProperty('rules');
			expect(Array.isArray(defaultPasswordRules.rules)).toBe(true);
			expect(defaultPasswordRules.rules).toHaveLength(2);

			// First rule group
			const firstRuleGroup = defaultPasswordRules.rules[0] as RuleGroup;
			expect(firstRuleGroup).toHaveProperty('rules');
			expect(firstRuleGroup).toHaveProperty('defaultError');
			expect(firstRuleGroup.rules).toHaveLength(3);

			// Second rule
			const secondRule = defaultPasswordRules.rules[1] as { name: string; config: any };
			expect(secondRule).toHaveProperty('name', 'MAX_LENGTH');
			expect(secondRule).toHaveProperty('config', { maximum: 64 });
		});

		it('should contain expected password rules', () => {
			const firstRuleGroup = defaultPasswordRules.rules[0] as RuleGroup;
			const rules = firstRuleGroup.rules as Array<{ name: string; config: any }>;

			expect(rules[0]).toEqual({ name: 'MIN_LENGTH', config: { minimum: 8 } });
			expect(rules[1]).toEqual({ name: 'CONTAINS_NUMBER', config: { minimum: 1 } });
			expect(rules[2]).toEqual({ name: 'CONTAINS_UPPERCASE', config: { minimum: 1 } });
		});

		it('should have default error message', () => {
			const firstRuleGroup = defaultPasswordRules.rules[0] as RuleGroup;
			expect(firstRuleGroup.defaultError).toEqual({
				messageKey: 'formInput.validator.defaultPasswordRequirements',
			});
		});
	});

	describe('VALIDATORS object', () => {
		it('should export all validators', () => {
			expect(VALIDATORS.REQUIRED).toBe(requiredValidator);
			expect(VALIDATORS.MIN_LENGTH).toBe(minLengthValidator);
			expect(VALIDATORS.MAX_LENGTH).toBe(maxLengthValidator);
			expect(VALIDATORS.CONTAINS_NUMBER).toBe(containsNumberValidator);
			expect(VALIDATORS.VALID_EMAIL).toBe(emailValidator);
			expect(VALIDATORS.CONTAINS_UPPERCASE).toBe(containsUpperCaseValidator);
			expect(VALIDATORS.DEFAULT_PASSWORD_RULES).toBe(defaultPasswordRules);
			expect(VALIDATORS.MATCH_REGEX).toBe(matchRegex);
		});

		it('should have all expected validator keys', () => {
			const expectedKeys = [
				'REQUIRED',
				'MIN_LENGTH',
				'MAX_LENGTH',
				'CONTAINS_NUMBER',
				'VALID_EMAIL',
				'CONTAINS_UPPERCASE',
				'DEFAULT_PASSWORD_RULES',
				'MATCH_REGEX',
			];

			expectedKeys.forEach((key) => {
				expect(VALIDATORS).toHaveProperty(key);
			});

			expect(Object.keys(VALIDATORS)).toHaveLength(expectedKeys.length);
		});
	});

	describe('getValidationError', () => {
		const validators = VALIDATORS;

		it('should validate using simple validator', () => {
			const result = getValidationError('', validators, requiredValidator);
			expect(result).toEqual({
				messageKey: 'formInput.validator.fieldRequired',
			});
		});

		it('should validate using validator with config', () => {
			const result = getValidationError('hi', validators, minLengthValidator, { minimum: 5 });
			expect(result).toEqual({
				messageKey: 'formInput.validator.minCharactersRequired',
				options: { minimum: 5 },
			});
		});

		it('should validate using rule group', () => {
			const ruleGroup: RuleGroup = {
				rules: [
					{ name: 'MIN_LENGTH', config: { minimum: 3 } },
					{ name: 'CONTAINS_NUMBER', config: { minimum: 1 } },
				],
			};

			const result1 = getValidationError('ab', validators, ruleGroup);
			expect(result1).toEqual({
				messageKey: 'formInput.validator.minCharactersRequired',
				options: { minimum: 3 },
			});

			const result2 = getValidationError('abc', validators, ruleGroup);
			expect(result2).toEqual({
				messageKey: 'formInput.validator.numbersRequired',
				options: { minimum: 1 },
			});

			const result3 = getValidationError('abc1', validators, ruleGroup);
			expect(result3).toBe(false);
		});

		it('should use default error when rule group has defaultError', () => {
			const ruleGroup: RuleGroup = {
				rules: [
					{ name: 'MIN_LENGTH', config: { minimum: 5 } },
					{ name: 'CONTAINS_NUMBER', config: { minimum: 1 } },
				],
				defaultError: {
					messageKey: 'custom.defaultError',
				},
			};

			const result = getValidationError('abc', validators, ruleGroup);
			expect(result).toEqual({
				messageKey: 'custom.defaultError',
			});
		});

		it('should handle nested rule groups', () => {
			const nestedRuleGroup: RuleGroup = {
				rules: [
					{
						rules: [
							{ name: 'MIN_LENGTH', config: { minimum: 3 } },
							{ name: 'CONTAINS_NUMBER', config: { minimum: 1 } },
						],
					} as RuleGroup,
					{ name: 'MAX_LENGTH', config: { maximum: 10 } },
				],
			};

			const result1 = getValidationError('ab', validators, nestedRuleGroup);
			expect(result1).toEqual({
				messageKey: 'formInput.validator.minCharactersRequired',
				options: { minimum: 3 },
			});

			const result2 = getValidationError('abc123456789', validators, nestedRuleGroup);
			expect(result2).toEqual({
				messageKey: 'formInput.validator.maxCharactersRequired',
				options: { maximum: 10 },
			});
		});

		it('should skip unknown validators', () => {
			const ruleGroup: RuleGroup = {
				rules: [
					{ name: 'UNKNOWN_VALIDATOR', config: { test: true } },
					{ name: 'MIN_LENGTH', config: { minimum: 5 } },
				],
			};

			const result = getValidationError('abc', validators, ruleGroup);
			expect(result).toEqual({
				messageKey: 'formInput.validator.minCharactersRequired',
				options: { minimum: 5 },
			});
		});

		it('should return false for valid input', () => {
			const result = getValidationError('hello world', validators, requiredValidator);
			expect(result).toBe(false);
		});

		it('should handle invalid validator objects gracefully', () => {
			const invalidValidator = {} as any;
			const result = getValidationError('test', validators, invalidValidator);
			expect(result).toBe(false);
		});

		it('should validate default password rules', () => {
			// Valid password
			const validPassword = 'Password123';
			const validResult = getValidationError(validPassword, validators, defaultPasswordRules);
			expect(validResult).toBe(false);

			// Invalid password (too short)
			const shortPassword = 'Pass1';
			const shortResult = getValidationError(shortPassword, validators, defaultPasswordRules);
			expect(shortResult).toEqual({
				messageKey: 'formInput.validator.defaultPasswordRequirements',
			});

			// Invalid password (no number)
			const noNumberPassword = 'Password';
			const noNumberResult = getValidationError(noNumberPassword, validators, defaultPasswordRules);
			expect(noNumberResult).toEqual({
				messageKey: 'formInput.validator.defaultPasswordRequirements',
			});

			// Invalid password (no uppercase)
			const noUpperPassword = 'password123';
			const noUpperResult = getValidationError(noUpperPassword, validators, defaultPasswordRules);
			expect(noUpperResult).toEqual({
				messageKey: 'formInput.validator.defaultPasswordRequirements',
			});

			// Invalid password (too long)
			const longPassword = 'A'.repeat(65) + '1';
			const longResult = getValidationError(longPassword, validators, defaultPasswordRules);
			expect(longResult).toEqual({
				messageKey: 'formInput.validator.maxCharactersRequired',
				options: { maximum: 64 },
			});
		});
	});
});
