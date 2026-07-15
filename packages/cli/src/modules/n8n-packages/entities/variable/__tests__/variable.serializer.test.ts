import type { Variables } from '@n8n/db';

import { VariableSerializer } from '../variable.serializer';

function makeVariable(overrides: Partial<Variables> = {}): Variables {
	return {
		id: 'var-1',
		key: 'API_URL',
		type: 'string',
		value: 'https://api.example.com',
		project: null,
		...overrides,
	} as unknown as Variables;
}

describe('VariableSerializer', () => {
	const serializer = new VariableSerializer();

	it('maps the DB key to name and returns name, type, value', () => {
		const serialized = serializer.serialize(makeVariable());

		expect(serialized).toEqual({
			name: 'API_URL',
			type: 'string',
			value: 'https://api.example.com',
		});
		expect(Object.keys(serialized).sort()).toEqual(['name', 'type', 'value']);
	});

	it('never exposes the DB id or key fields', () => {
		const serialized = serializer.serialize(makeVariable()) as unknown as Record<string, unknown>;

		expect(serialized.id).toBeUndefined();
		expect(serialized.key).toBeUndefined();
	});

	it('keeps an empty string value', () => {
		const serialized = serializer.serialize(makeVariable({ value: '' }));

		expect(serialized.value).toBe('');
	});

	it('omits the value entirely when includeValue is false', () => {
		const serialized = serializer.serialize(makeVariable(), { includeValue: false });

		expect(serialized).toEqual({ name: 'API_URL', type: 'string' });
		expect(Object.keys(serialized)).not.toContain('value');
	});
});
