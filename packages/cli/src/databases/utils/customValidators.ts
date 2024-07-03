import { registerDecorator } from 'class-validator';

export function NoXss() {
	return (object: object, propertyName: string): void => {
		registerDecorator({
			name: 'NoXss',
			target: object.constructor,
			propertyName,
			constraints: [propertyName],
			options: { message: `Malicious ${propertyName}` },
			validator: {
				validate(value: string) {
					return !/(^http|^www)|<(\s*)?(script|a)|(\.[\p{L}\d-]+)/u.test(value);
				},
			},
		});
	};
}
