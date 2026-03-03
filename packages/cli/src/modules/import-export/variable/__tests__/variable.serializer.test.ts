import type { Variables } from '@n8n/db';

import { VariableSerializer } from '../variable.serializer';

describe('VariableSerializer', () => {
	const serializer = new VariableSerializer();

	const baseVariable = {
		id: 'var11100-0000-0000-0000-000000000000',
		key: 'API_BASE_URL',
		type: 'string',
		value: 'https://api.example.com',
		project: { id: 'project-1' },
	} as unknown as Variables;

	it('should serialize id, key, type, and value', () => {
		const result = serializer.serialize(baseVariable);

		expect(result).toEqual({
			id: 'var11100-0000-0000-0000-000000000000',
			key: 'API_BASE_URL',
			type: 'string',
			value: 'https://api.example.com',
		});
	});

	it('should omit relations', () => {
		const result = serializer.serialize(baseVariable);

		expect(result).not.toHaveProperty('project');
	});
});
