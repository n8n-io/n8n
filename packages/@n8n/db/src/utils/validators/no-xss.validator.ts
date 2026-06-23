import type { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
import { registerDecorator, ValidatorConstraint } from 'class-validator';
import xss from 'xss';

@ValidatorConstraint({ name: 'NoXss', async: false })
class NoXssConstraint implements ValidatorConstraintInterface {
	validate(value: unknown) {
		if (typeof value !== 'string') return false;

		return (
			value ===
			xss(value, {
				whiteList: {}, // no tags are allowed
			})
		);
	}

	defaultMessage() {
		return 'Only letters, numbers, spaces and punctuation are allowed';
	}
}

export function NoXss(options?: ValidationOptions) {
	return function (object: object, propertyName: string) {
		registerDecorator({
			name: 'NoXss',
			target: object.constructor,
			propertyName,
			options,
			validator: NoXssConstraint,
		});
	};
}
