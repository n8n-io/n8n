import { serializedVariableSchema } from '../variable.schema';

describe('serializedVariableSchema', () => {
	it('accepts a global string variable with a value', () => {
		const variable = { name: 'API_URL', type: 'string', value: 'https://api.example.com' };

		expect(() => serializedVariableSchema.parse(variable)).not.toThrow();
	});

	it('accepts a project-scoped string variable', () => {
		const variable = { name: 'API_URL', type: 'string', value: 'v', projectId: 'proj-1' };

		expect(() => serializedVariableSchema.parse(variable)).not.toThrow();
	});

	it('accepts a value-less non-string variable', () => {
		const variable = { name: 'FUTURE_SECRET', type: 'secret' };

		expect(() => serializedVariableSchema.parse(variable)).not.toThrow();
	});

	it('rejects a non-string variable carrying a value', () => {
		const variable = { name: 'FUTURE_SECRET', type: 'secret', value: 'must-not-travel' };

		expect(() => serializedVariableSchema.parse(variable)).toThrow(/must not carry a value/i);
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
