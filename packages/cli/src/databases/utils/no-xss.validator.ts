import type { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
import { registerDecorator, ValidatorConstraint } from 'class-validator';
import sanitizeHtml from 'sanitize-html';

const URL_REGEX = /^(https?:\/\/|www\.)/i;

@ValidatorConstraint({ name: 'NoXss', async: false })
class NoXssConstraint implements ValidatorConstraintInterface {
	validate(value: string) {
		const sanitized = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

		if (sanitized !== value) return false;

		return !URL_REGEX.test(value);
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
