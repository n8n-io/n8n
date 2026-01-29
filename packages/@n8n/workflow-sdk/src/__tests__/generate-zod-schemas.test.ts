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

	it('strips @version along with other discriminator keys', () => {
		const result = stripDiscriminatorKeysFromDisplayOptions(
			{ show: { '@version': [1, 1.1], resource: ['task'], someOther: ['value'] } },
			['resource', 'operation', '@version'],
		);
		expect(result).toEqual({ show: { someOther: ['value'] } });
	});

	it('returns undefined when only @version remains after stripping other discriminators', () => {
		const result = stripDiscriminatorKeysFromDisplayOptions(
			{ show: { '@version': [1, 1.1], resource: ['task'] } },
			['resource', '@version'],
		);
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

	it('strips @version from displayOptions along with resource/operation', () => {
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
				// displayOptions with @version - should be stripped since version is implicit in file path
				displayOptions: { show: { '@version': [1, 1.1], resource: ['task'], mode: ['advanced'] } },
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

		// Should contain resolveSchema call since mode remains
		expect(code).toContain('resolveSchema({');
		// Should contain mode condition (not stripped)
		expect(code).toContain('"mode"');
		// Should NOT contain @version in the displayOptions (it's redundant)
		expect(code).not.toContain('"@version"');
	});

	it('converts to static property when @version is the only remaining condition', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			version: 1,
			properties: [],
		};

		const props: NodeProperty[] = [
			{
				name: 'versionOnlyField',
				displayName: 'Version Only',
				type: 'string',
				default: '',
				// displayOptions with only @version and discriminators - all should be stripped
				displayOptions: { show: { '@version': [1], resource: ['task'], operation: ['create'] } },
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

		// Should NOT use resolveSchema (no remaining conditions)
		expect(code).not.toMatch(/versionOnlyField:.*resolveSchema/);
		// Should use static schema instead
		expect(code).toContain('versionOnlyField: stringOrExpression');
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

	it('strips @version from displayOptions since version is implicit in file path', () => {
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
					// @version should be stripped, mode should remain
					displayOptions: { show: { '@version': [1, 1.1], mode: ['advanced'] } },
				},
			],
		};

		const code = generateSingleVersionSchemaFile(node, 1);

		// Should contain resolveSchema call since mode remains
		expect(code).toContain('resolveSchema({');
		// Should contain mode condition
		expect(code).toContain('"mode"');
		// Should NOT contain @version in the displayOptions
		expect(code).not.toContain('"@version"');
	});

	it('generates static schema when @version is the only displayOption', () => {
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.simpleNode',
			displayName: 'Simple Node',
			version: 1,
			properties: [
				{
					name: 'versionField',
					displayName: 'Version Field',
					type: 'string',
					default: '',
					// Only @version in displayOptions - should be fully stripped
					displayOptions: { show: { '@version': [1] } },
				},
			],
		};

		const code = generateSingleVersionSchemaFile(node, 1);

		// Should generate static schema (no factory function needed since @version is stripped)
		expect(code).toContain('export const');
		expect(code).not.toContain('export function get');
		// Should NOT contain @version anywhere
		expect(code).not.toContain('@version');
	});

	it('generates static schema for multi-version node where @version is the only displayOption', () => {
		// This tests the calTrigger scenario: multi-version node with version-conditional properties
		// The actual calTrigger has TWO version properties - one for each @version
		const node: NodeTypeDescription = {
			...baseNodeProps,
			name: 'n8n-nodes-base.calTrigger',
			displayName: 'Cal.com Trigger',
			version: [1, 2], // Multi-version node - this is key!
			properties: [
				{
					name: 'events',
					displayName: 'Events',
					type: 'multiOptions',
					options: [{ name: 'Created', value: 'CREATED' }],
					default: [],
					required: true,
				},
				// First version property - for v1
				{
					name: 'version',
					displayName: 'API Version',
					type: 'options',
					options: [
						{ name: 'v1', value: 1 },
						{ name: 'v2', value: 2 },
					],
					default: 1,
					displayOptions: { show: { '@version': [1] } },
				},
				// Second version property - for v2 (should be filtered out for v1 schema)
				{
					name: 'version',
					displayName: 'API Version',
					type: 'options',
					options: [
						{ name: 'v1', value: 1 },
						{ name: 'v2', value: 2 },
					],
					default: 2,
					displayOptions: { show: { '@version': [2] } },
				},
			],
		};

		const code = generateSingleVersionSchemaFile(node, 1);

		// Should generate static schema (no factory function needed since @version is stripped)
		expect(code).toContain('export const');
		expect(code).not.toContain('export function get');
		// Should NOT contain @version anywhere
		expect(code).not.toContain('@version');
		// Should NOT import resolveSchema
		expect(code).not.toContain('resolveSchema');
	});
});
