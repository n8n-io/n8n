import validator from 'validator';

/** The shape express-openapi-validator (via ajv) expects for a custom string format. */
interface CustomFormat {
	type?: 'string' | 'number';
	validate: (value: string) => boolean;
}

/** Custom string formats in the Public API OpenAPI spec. Do not import EOV here: it loads lazily. */
export const publicApiValidatorFormats = {
	email: {
		type: 'string',
		validate: (email: string) => validator.isEmail(email),
	},
	identifier: {
		type: 'string',
		validate: (identifier: string) => validator.isUUID(identifier) || validator.isEmail(identifier),
	},
	jsonString: {
		validate: (data: string) => {
			try {
				JSON.parse(data);
				return true;
			} catch (e) {
				return false;
			}
		},
	},
	nanoid: {
		type: 'string',
		validate: (id: string) => {
			return /^[A-Za-z0-9]{16}$/.test(id);
		},
	},
} satisfies Record<string, CustomFormat>;
