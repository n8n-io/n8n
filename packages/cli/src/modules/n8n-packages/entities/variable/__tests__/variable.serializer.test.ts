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

	it('maps the DB key to name and returns name, type, value for a global string variable', () => {
		const serialized = serializer.serialize(makeVariable());

		expect(serialized).toEqual({
			name: 'API_URL',
			type: 'string',
			value: 'https://api.example.com',
		});
		expect(Object.keys(serialized).sort()).toEqual(['name', 'type', 'value']);
	});

	it('includes projectId for a project-scoped variable', () => {
		const serialized = serializer.serialize(
			makeVariable({ project: { id: 'proj-billing' } as Variables['project'] }),
		);

		expect(serialized).toEqual({
			name: 'API_URL',
			type: 'string',
			value: 'https://api.example.com',
			projectId: 'proj-billing',
		});
	});

	it('never exposes the DB id or key fields', () => {
		const serialized = serializer.serialize(makeVariable()) as unknown as Record<string, unknown>;

		expect(serialized.id).toBeUndefined();
		expect(serialized.key).toBeUndefined();
	});

	it('refuses to serialize any non-string type', () => {
		expect(() =>
			serializer.serialize(makeVariable({ type: 'secret', value: 'must-not-leak' })),
		).toThrow(/unsupported type "secret"/i);
	});

	it('keeps an empty string value for string variables', () => {
		const serialized = serializer.serialize(makeVariable({ value: '' }));

		expect(serialized.value).toBe('');
	});
});
