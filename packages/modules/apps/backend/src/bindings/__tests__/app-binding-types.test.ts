import { jsonSchemaToTs, renderBindingTypes } from '../app-binding-types';

describe('jsonSchemaToTs', () => {
	it('converts primitives, unions, and arrays', () => {
		expect(jsonSchemaToTs({ type: 'integer' })).toBe('number');
		expect(jsonSchemaToTs({ type: ['string', 'null'] })).toBe('string | null');
		expect(jsonSchemaToTs({ type: 'array', items: { type: 'boolean' } })).toBe('Array<boolean>');
		expect(jsonSchemaToTs({ enum: ['a', 1] })).toBe('"a" | 1');
	});

	it('marks optional properties and keeps open objects open', () => {
		expect(
			jsonSchemaToTs({
				type: 'object',
				properties: { id: { type: 'number' }, 'first name': { type: 'string' } },
				required: ['id'],
				additionalProperties: false,
			}),
		).toBe('{ id: number; "first name"?: string }');
		expect(jsonSchemaToTs({ type: 'object', additionalProperties: true })).toBe(
			'{ [key: string]: unknown }',
		);
	});

	it('falls back to unknown for schemas it does not understand', () => {
		expect(jsonSchemaToTs({})).toBe('unknown');
		expect(jsonSchemaToTs('nope')).toBe('unknown');
	});
});

describe('renderBindingTypes', () => {
	it('augments the SDK bindings and leaves out missing resources', () => {
		const output = renderBindingTypes([
			{
				key: 'tasks',
				kind: 'dataTable',
				dataTableId: 't1',
				permissions: ['read', 'insert'],
				name: 'Tasks',
				columns: [{ name: 'title', type: 'string' }],
				row: {
					type: 'object',
					properties: { id: { type: 'number' }, title: { type: ['string', 'null'] } },
					required: ['id', 'title'],
					additionalProperties: false,
				},
			},
			{
				key: 'submit',
				kind: 'workflow',
				workflowId: 'w1',
				name: 'Submit',
				published: true,
				input: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
				output: { type: 'array', items: { type: 'object', additionalProperties: true } },
			},
			{
				key: 'gone',
				kind: 'agent',
				agentId: 'a1',
				permissions: ['chat'],
				name: 'gone',
				missing: true,
			},
		]);

		expect(output).toContain("declare module '@n8n/app-sdk'");
		expect(output).toContain(
			'tasks: { row: { id: number; title: string | null }; permissions: ["read","insert"] };',
		);
		expect(output).toContain(
			'submit: { input: { email: string; [key: string]: unknown }; output: Array<{ [key: string]: unknown }> };',
		);
		expect(output).not.toContain('gone');
	});
});
