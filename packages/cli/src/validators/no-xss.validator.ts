import type { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
import { registerDecorator, ValidatorConstraint } from 'class-validator';
import sanitizeHtml from 'sanitize-html';

@ValidatorConstraint({ name: 'NoXss', async: false })
class NoXssConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		return value === sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
	}

	defaultMessage() {
		return 'Potentially malicious string';
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
