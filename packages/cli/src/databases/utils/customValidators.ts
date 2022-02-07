/* eslint-disable @typescript-eslint/naming-convention */
import { registerDecorator } from 'class-validator';

/**
 * Validate that a string does not contain a script tag `<script ...>`
 */
export function DoesNotContainScriptTag() {
	return (object: object, propertyName: string): void => {
		registerDecorator({
			name: 'isNotJsScript',
			target: object.constructor,
			propertyName,
			constraints: [propertyName],
			options: { message: 'Script detected' },
			validator: {
				validate(value: string) {
					return !/<(\s*)?script/.test(value);
				},
			},
		});
	};
}

/**
 * Validate that a string does not contain an anchor link tag `<a ...>`
 */
export function DoesNotContainLinkTag() {
	return (object: object, propertyName: string): void => {
		registerDecorator({
			name: 'isNotJsScript',
			target: object.constructor,
			propertyName,
			constraints: [propertyName],
			options: { message: 'Anchor link detected' },
			validator: {
				validate(value: string) {
					return !/<(\s*)?a/.test(value);
				},
			},
		});
	};
}
