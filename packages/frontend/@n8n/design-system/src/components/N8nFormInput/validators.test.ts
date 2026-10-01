import {
	createPasswordRules,
	defaultPasswordRules,
	getValidationError,
	VALIDATORS,
} from './validators';
import type { IValidator, RuleGroup } from '../../types';

const validators = VALIDATORS as unknown as Record<string, IValidator | RuleGroup>;

describe('createPasswordRules', () => {
	it('should create rules with the specified minimum length', () => {
		const rules = createPasswordRules(12);
		const innerGroup = rules.rules[0] as RuleGroup;
		const minLengthRule = innerGroup.rules[0] as { name: string; config: { minimum: number } };

		expect(minLengthRule.name).toBe('MIN_LENGTH');
		expect(minLengthRule.config.minimum).toBe(12);
	});

	it('should include the minimum in defaultError options', () => {
		const rules = createPasswordRules(15);
		const innerGroup = rules.rules[0] as RuleGroup;

		expect(innerGroup.defaultError).toEqual({
			messageKey: 'formInput.validator.defaultPasswordRequirements',
			options: { minimum: 15 },
		});
	});

	it('should default to 8 when no argument is provided', () => {
		const rules = createPasswordRules();
		const innerGroup = rules.rules[0] as RuleGroup;
		const minLengthRule = innerGroup.rules[0] as { name: string; config: { minimum: number } };

		expect(minLengthRule.config.minimum).toBe(8);
		expect(innerGroup.defaultError?.options).toEqual({ minimum: 8 });
	});

	it('defaultPasswordRules should use minimum of 8', () => {
		const innerGroup = defaultPasswordRules.rules[0] as RuleGroup;
		const minLengthRule = innerGroup.rules[0] as { name: string; config: { minimum: number } };

		expect(minLengthRule.config.minimum).toBe(8);
	});
});

describe('password validation with custom min length', () => {
	it('should reject passwords shorter than the custom minimum', () => {
		const rules = createPasswordRules(12);
		const error = getValidationError('Short1Pass', validators, rules);

		expect(error).toBeTruthy();
		expect(error).toHaveProperty('messageKey', 'formInput.validator.defaultPasswordRequirements');
	});

	it('should accept passwords meeting the custom minimum', () => {
		const rules = createPasswordRules(12);
		const error = getValidationError('LongEnough1Pass', validators, rules);

		expect(error).toBeFalsy();
	});

	it('should reject passwords missing uppercase with custom min length', () => {
		const rules = createPasswordRules(8);
		const error = getValidationError('alllowercase1', validators, rules);

		expect(error).toBeTruthy();
		expect(error).toHaveProperty('messageKey', 'formInput.validator.defaultPasswordRequirements');
	});

	it('should reject passwords missing numbers with custom min length', () => {
		const rules = createPasswordRules(8);
		const error = getValidationError('NoNumbersHere', validators, rules);

		expect(error).toBeTruthy();
		expect(error).toHaveProperty('messageKey', 'formInput.validator.defaultPasswordRequirements');
	});
});
