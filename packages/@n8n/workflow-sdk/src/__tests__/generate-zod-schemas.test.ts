import {
	generateConditionalSchemaLine,
	generateSingleVersionSchemaFile,
	stripDiscriminatorKeysFromDisplayOptions,
	generateDiscriminatorSchemaFile,
} from '../generate-types/generate-zod-schemas';
import type { NodeProperty, NodeTypeDescription } from '../generate-types/generate-types';

describe('generateConditionalSchemaLine', () => {
	it('generates resolveSchema call for property with displayOptions.show', () => {
		const prop: NodeProperty = {
			name: 'nodeCredentialType',
			displayName: 'Node Credential Type',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
		};

		const line = generateConditionalSchemaLine(prop);

		expect(line).toContain('resolveSchema({');
		expect(line).toContain('parameters');
		expect(line).toContain('schema: stringOrExpression');
		expect(line).toContain('required: true');
		expect(line).toContain('displayOptions:');
		expect(line).toContain('authentication');
	});

	it('generates resolveSchema call with required false when property not required', () => {
		const prop: NodeProperty = {
			name: 'optionalField',
			displayName: 'Optional Field',
			type: 'string',
			default: '',
			displayOptions: { show: { mode: ['advanced'] } },
		};

		const line = generateConditionalSchemaLine(prop);

		expect(line).toContain('required: false');
	});

	it('generates resolveSchema call with hide displayOptions', () => {
		const prop: NodeProperty = {
			name: 'hiddenWhenNone',
			displayName: 'Hidden When None',
			type: 'boolean',
			default: false,
			displayOptions: { hide: { authentication: ['none'] } },
		};

		const line = generateConditionalSchemaLine(prop);

		expect(line).toContain('displayOptions:');
		expect(line).toContain('hide');
		expect(line).toContain('none');
	});
});

describe('stripDiscriminatorKeysFromDisplayOptions', () => {
	it('removes discriminator keys from show conditions', () => {
		const result = stripDiscriminatorKeysFromDisplayOptions(
			{ show: { resource: ['task'], operation: ['create'], mode: ['advanced'] } },
			['resource', 'operation'],
		);
		expect(result).toEqual({ show: { mode: ['advanced'] } });
	});

	it('returns undefined when all conditions are discriminator keys', () => {
		const result = stripDiscriminatorKeysFromDisplayOptions(
			{ show: { resource: ['task'], operation: ['create'] } },
			['resource', 'operation'],
		);
		expect(result).toBeUndefined();
	});

	it('removes discriminator keys from hide conditions', () => {
		const result = stripDiscriminatorKeysFromDisplayOptions(
			{ hide: { resource: ['task'], advanced: ['false'] } },
			['resource'],
		);
		expect(result).toEqual({ hide: { advanced: ['false'] } });
	});

	it('handles both show and hide conditions', () => {
		const result = stripDiscriminatorKeysFromDisplayOptions(
			{
				show: { resource: ['task'], mode: ['advanced'] },
				hide: { operation: ['delete'], status: ['disabled'] },
			},
			['resource', 'operation'],
		);
		expect(result).toEqual({
			show: { mode: ['advanced'] },
			hide: { status: ['disabled'] },
		});
	});

	it('handles empty displayOptions', () => {
		const result = stripDiscriminatorKeysFromDisplayOptions({}, ['resource']);
		expect(result).toBeUndefined();
	});
});

describe('generateDiscriminatorSchemaFile with displayOptions', () => {
	const baseNodeProps = {
		group: ['transform'] as string[],
		inputs: ['main'] as string[],
		outputs: ['main'] as string[],
	};

	it('imports resolveSchema when properties have remaining displayOptions', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [],
		};

		const props: NodeProperty[] = [
			{
				name: 'conditionalField',
				displayName: 'Conditional',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['task'], mode: ['advanced'] } },
			},
		];

		const code = generateDiscriminatorSchemaFile(
			node,
			1,
			{ resource: 'task', operation: 'create' },
			props,
			5,
			[],
		);

		expect(code).toContain('resolveSchema,');
	});

	it('uses resolveSchema for properties with remaining displayOptions', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [],
		};

		const props: NodeProperty[] = [
			{
				name: 'conditionalField',
				displayName: 'Conditional',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['task'], mode: ['advanced'] } },
			},
		];

		const code = generateDiscriminatorSchemaFile(
			node,
			1,
			{ resource: 'task', operation: 'create' },
			props,
			5,
			[],
		);

		expect(code).toContain('resolveSchema({');
		expect(code).toContain('"mode"'); // Remaining condition preserved
	});

	it('uses static property schema when displayOptions only contain discriminator keys', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [],
		};

		const props: NodeProperty[] = [
			{
				name: 'simpleField',
				displayName: 'Simple',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['task'], operation: ['create'] } },
			},
		];

		const code = generateDiscriminatorSchemaFile(
			node,
			1,
			{ resource: 'task', operation: 'create' },
			props,
			5,
			[],
		);

		// All discriminated schemas export factory functions
		expect(code).toContain('export default function getSchema');
		// But the property uses static schema (no resolveSchema call in body)
		expect(code).toContain('simpleField: stringOrExpression');
		expect(code).not.toMatch(/simpleField:.*resolveSchema/);
	});

	it('always exports factory function for discriminated schemas', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [],
		};

		const props: NodeProperty[] = [
			{
				name: 'conditionalField',
				displayName: 'Conditional',
				type: 'string',
				default: '',
				displayOptions: { show: { mode: ['advanced'] } },
			},
		];

		const code = generateDiscriminatorSchemaFile(
			node,
			1,
			{ resource: 'task', operation: 'create' },
			props,
			5,
			[],
		);

		expect(code).toContain('export default function getSchema');
		expect(code).toContain('{ parameters, resolveSchema }');
		expect(code).toContain('return z.object({');
	});

	it('does not import resolveSchema when no properties need dynamic resolution', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [],
		};

		const props: NodeProperty[] = [
			{
				name: 'simpleField',
				displayName: 'Simple',
				type: 'string',
				default: '',
			},
		];

		const code = generateDiscriminatorSchemaFile(
			node,
			1,
			{ resource: 'task', operation: 'create' },
			props,
			5,
			[],
		);

		// Factory function always has resolveSchema in signature
		expect(code).toContain('export default function getSchema');
		// But should not import resolveSchema from base.schema if not used in body
		expect(code).not.toMatch(/import\s*\{[^}]*resolveSchema[^}]*\}/);
	});
});

describe('generateSingleVersionSchemaFile', () => {
	const baseNodeProps = {
		group: ['transform'] as string[],
		inputs: ['main'] as string[],
		outputs: ['main'] as string[],
	};

	it('generates factory function when node has properties with displayOptions', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [
				{ name: 'url', displayName: 'URL', type: 'string', required: true, default: '' },
				{
					name: 'conditionalField',
					displayName: 'Conditional Field',
					type: 'string',
					required: true,
					default: '',
					displayOptions: { show: { mode: ['advanced'] } },
				},
			],
		};

		const code = generateSingleVersionSchemaFile(node, 1);

		// Should generate a factory function instead of static schema
		expect(code).toContain('export function get');
		expect(code).toContain('{ parameters, resolveSchema }');
		expect(code).toContain('return z.object({');
	});

	it('generates static schema when node has no properties with displayOptions', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.simpleNode',
			displayName: 'Simple Node',
			version: 1,
			properties: [
				{ name: 'url', displayName: 'URL', type: 'string', required: true, default: '' },
				{ name: 'method', displayName: 'Method', type: 'string', default: 'GET' },
			],
		};

		const code = generateSingleVersionSchemaFile(node, 1);

		// Should generate static schema (export const, not export function)
		expect(code).toContain('export const');
		expect(code).not.toContain('export function get');
	});

	it('imports resolveSchema helper when generating factory function', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [
				{
					name: 'conditionalField',
					displayName: 'Conditional Field',
					type: 'string',
					default: '',
					displayOptions: { show: { mode: ['advanced'] } },
				},
			],
		};

		const code = generateSingleVersionSchemaFile(node, 1);

		// Should import resolveSchema from base.schema
		expect(code).toContain('resolveSchema');
	});
});
