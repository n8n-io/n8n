import { serializedVariableSchema } from '../variable.schema';

describe('serializedVariableSchema', () => {
	it('accepts a string variable with a value', () => {
		const variable = { name: 'API_URL', type: 'string', value: 'https://api.example.com' };

		expect(() => serializedVariableSchema.parse(variable)).not.toThrow();
	});

	it('accepts a value-less variable', () => {
		const variable = { name: 'API_URL', type: 'string' };

		expect(() => serializedVariableSchema.parse(variable)).not.toThrow();
	});

	it('rejects unknown keys such as a DB id', () => {
		const variable = { id: 'var-1', name: 'API_URL', type: 'string', value: 'v' };

		expect(() => serializedVariableSchema.parse(variable)).toThrow();
	});

	it('rejects an empty name', () => {
		const variable = { name: '', type: 'string', value: 'v' };

		expect(() => serializedVariableSchema.parse(variable)).toThrow();
	});
});
