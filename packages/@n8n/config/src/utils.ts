export class StringArray<T extends string> extends Array<T> {
	constructor(str: string) {
		super();
		const parsed = str.split(',') as StringArray<T>;
		return parsed.every((i) => typeof i === 'string') ? parsed : [];
	}
}

export function IsIn<T>(
	allowedValues: readonly T[],
	{ allowEmpty }: { allowEmpty: boolean },
): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol) {
		const field = String(propertyKey);

		let value: T[];

		const getter = function () {
			return value;
		};

		const setter = function (newVal: T[]) {
			if (!Array.isArray(newVal)) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error(`${field} must be an array.`);
			}

			if (allowEmpty && newVal.length === 0) {
				value = newVal;
				return;
			}

			if (newVal.length > 0 && !newVal.every((item) => allowedValues.includes(item))) {
				// eslint-disable-next-line n8n-local-rules/no-plain-errors
				throw new Error(`Every item in \`${field}\` must be one of ${allowedValues.join(', ')}`);
			}

			value = newVal;
		};

		Object.defineProperty(target, propertyKey, {
			get: getter,
			set: setter,
			enumerable: true,
			configurable: true,
		});
	};
}
