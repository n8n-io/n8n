import type { NodeProperty, NodeTypeDescription } from './generate-types';
import {
	generateConditionalSchemaLine,
	generateSingleVersionSchemaFile,
	stripDiscriminatorKeysFromDisplayOptions,
	generateDiscriminatorSchemaFile,
	generateSubnodeConfigSchemaCode,
	mapPropertyToZodSchema,
	mergeDisplayOptions,
	extractDefaultsForDisplayOptions,
} from './generate-zod-schemas';

describe('mapPropertyToZodSchema for resourceLocator', () => {
	it('returns resourceLocatorValueSchema when no modes are specified', () => {
		const prop: NodeProperty = {
			name: 'document',
			displayName: 'Document',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
		};

		const schema = mapPropertyToZodSchema(prop);

		expect(schema).toBe('resourceLocatorValueSchema');
	});

	it('generates inline schema with single mode literal', () => {
		const prop: NodeProperty = {
			name: 'document',
			displayName: 'Document',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			modes: [{ displayName: 'List', name: 'list', type: 'list' }],
		};

		const schema = mapPropertyToZodSchema(prop);

		expect(schema).toContain("z.literal('list')");
		expect(schema).toContain('z.object({');
		expect(schema).toContain('__rl: z.literal(true)');
		expect(schema).toContain('value: z.union([z.string(), z.number()])');
		expect(schema).toContain('cachedResultName: z.string().optional()');
		expect(schema).toContain('cachedResultUrl: z.string().optional()');
		// Should not use z.union for mode when there's only one mode
		expect(schema).not.toContain('z.union([z.literal');
	});

	it('generates inline schema with multiple modes as union', () => {
		const prop: NodeProperty = {
			name: 'document',
			displayName: 'Document',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			modes: [
				{ displayName: 'List', name: 'list', type: 'list' },
				{ displayName: 'URL', name: 'url', type: 'string' },
				{ displayName: 'ID', name: 'id', type: 'string' },
			],
		};

		const schema = mapPropertyToZodSchema(prop);

		expect(schema).toContain('z.object({');
		expect(schema).toContain('__rl: z.literal(true)');
		// Should use z.union for mode with multiple modes
		expect(schema).toContain("z.union([z.literal('list'), z.literal('url'), z.literal('id')]");
		expect(schema).toContain('value: z.union([z.string(), z.number()])');
	});

	it('generates inline schema with two modes as union', () => {
		const prop: NodeProperty = {
			name: 'channel',
			displayName: 'Channel',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			modes: [
				{ displayName: 'List', name: 'list', type: 'list' },
				{ displayName: 'ID', name: 'id', type: 'string' },
			],
		};

		const schema = mapPropertyToZodSchema(prop);

		expect(schema).toContain("z.union([z.literal('list'), z.literal('id')]");
	});
});

describe('generateConditionalSchemaLine', () => {
	it('generates resolveSchema call for property with displayOptions.show', () => {
		const prop: NodeProperty = {
			name: 'nodeCredentialType',
			displayName: 'Node Credential Type',
			type: 'string',
			required: true,
			// No default - truly required
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
			displayOptions: { show: { mode: ['advanced'] } },
		};

		const line = generateConditionalSchemaLine(prop);

		expect(line).toContain('required: false');
	});

	it('generates resolveSchema call with required false when property has default value even if required: true', () => {
		const prop: NodeProperty = {
			name: 'text',
			displayName: 'Text',
			type: 'string',
			required: true, // marked required
			default: '={{ $json.chatInput }}', // but has a default
			displayOptions: { show: { promptType: ['auto'] } },
		};

		const line = generateConditionalSchemaLine(prop);

		// Should be required: false because it has a default value
		expect(line).toContain('required: false');
		expect(line).not.toContain('required: true');
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

	it('includes defaults for properties referenced in displayOptions', () => {
		const prop: NodeProperty = {
			name: 'httpMethod',
			displayName: 'HTTP Method',
			type: 'options',
			default: 'GET',
			options: [{ name: 'GET', value: 'GET' }],
			displayOptions: { show: { multipleMethods: [false, true] } },
		};

		const allProperties: NodeProperty[] = [
			{
				name: 'multipleMethods',
				displayName: 'Multiple Methods',
				type: 'boolean',
				default: false, // This default should be extracted
			},
			prop,
		];

		const line = generateConditionalSchemaLine(prop, allProperties);

		expect(line).toContain('defaults:');
		expect(line).toContain('"multipleMethods":false');
	});

	it('does not include defaults when no referenced properties have defaults', () => {
		const prop: NodeProperty = {
			name: 'conditionalField',
			displayName: 'Conditional Field',
			type: 'string',
			default: '',
			displayOptions: { show: { someProperty: ['value'] } },
		};

		const allProperties: NodeProperty[] = [
			{
				name: 'someProperty',
				displayName: 'Some Property',
				type: 'string',
				// No default value
			},
			prop,
		];

		const line = generateConditionalSchemaLine(prop, allProperties);

		expect(line).not.toContain('defaults:');
	});
});

describe('extractDefaultsForDisplayOptions', () => {
	it('extracts defaults for properties referenced in show conditions', () => {
		const displayOptions = { show: { multipleMethods: [false, true] } };
		const allProperties: NodeProperty[] = [
			{
				name: 'multipleMethods',
				displayName: 'Multiple Methods',
				type: 'boolean',
				default: false,
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		expect(defaults).toEqual({ multipleMethods: false });
	});

	it('extracts defaults for properties referenced in hide conditions', () => {
		const displayOptions = { hide: { mode: ['simple'] } };
		const allProperties: NodeProperty[] = [
			{
				name: 'mode',
				displayName: 'Mode',
				type: 'options',
				default: 'advanced',
				options: [
					{ name: 'Simple', value: 'simple' },
					{ name: 'Advanced', value: 'advanced' },
				],
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		expect(defaults).toEqual({ mode: 'advanced' });
	});

	it('extracts defaults for multiple referenced properties', () => {
		const displayOptions = {
			show: { multipleMethods: [true], authentication: ['predefined'] },
		};
		const allProperties: NodeProperty[] = [
			{
				name: 'multipleMethods',
				displayName: 'Multiple Methods',
				type: 'boolean',
				default: false,
			},
			{
				name: 'authentication',
				displayName: 'Authentication',
				type: 'options',
				default: 'none',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'Predefined', value: 'predefined' },
				],
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		expect(defaults).toEqual({ multipleMethods: false, authentication: 'none' });
	});

	it('skips properties without defaults', () => {
		const displayOptions = { show: { propWithDefault: [true], propWithoutDefault: ['value'] } };
		const allProperties: NodeProperty[] = [
			{
				name: 'propWithDefault',
				displayName: 'With Default',
				type: 'boolean',
				default: true,
			},
			{
				name: 'propWithoutDefault',
				displayName: 'Without Default',
				type: 'string',
				// No default
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		expect(defaults).toEqual({ propWithDefault: true });
		expect(defaults).not.toHaveProperty('propWithoutDefault');
	});

	it('skips @version meta-property', () => {
		const displayOptions = { show: { '@version': [1, 2], mode: ['advanced'] } };
		const allProperties: NodeProperty[] = [
			{
				name: 'mode',
				displayName: 'Mode',
				type: 'string',
				default: 'simple',
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		expect(defaults).toEqual({ mode: 'simple' });
		expect(defaults).not.toHaveProperty('@version');
	});

	it('skips root path references (/ prefix)', () => {
		const displayOptions = { show: { '/globalSetting': ['enabled'], mode: ['advanced'] } };
		const allProperties: NodeProperty[] = [
			{
				name: 'mode',
				displayName: 'Mode',
				type: 'string',
				default: 'simple',
			},
			{
				name: 'globalSetting',
				displayName: 'Global Setting',
				type: 'string',
				default: 'enabled',
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		// Should only include mode, not globalSetting (since it was referenced with /)
		expect(defaults).toEqual({ mode: 'simple' });
	});

	it('handles nested property paths by extracting base property', () => {
		const displayOptions = { show: { 'options.format': ['json'] } };
		const allProperties: NodeProperty[] = [
			{
				name: 'options',
				displayName: 'Options',
				type: 'collection',
				default: { format: 'text' },
				options: [],
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		expect(defaults).toEqual({ options: { format: 'text' } });
	});

	it('returns empty object when no properties have defaults', () => {
		const displayOptions = { show: { propA: ['value'], propB: ['value'] } };
		const allProperties: NodeProperty[] = [
			{
				name: 'propA',
				displayName: 'Property A',
				type: 'string',
				// No default
			},
			{
				name: 'propB',
				displayName: 'Property B',
				type: 'string',
				// No default
			},
		];

		const defaults = extractDefaultsForDisplayOptions(displayOptions, allProperties);

		expect(defaults).toEqual({});
	});

	it('returns empty object for empty displayOptions', () => {
		const defaults = extractDefaultsForDisplayOptions({}, []);
		expect(defaults).toEqual({});
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

describe('mergeDisplayOptions', () => {
	it('merges show conditions with same key', () => {
		const result = mergeDisplayOptions(
			{ show: { promptType: ['guardrails'] } },
			{ show: { promptType: ['auto'] } },
		);
		expect(result).toEqual({ show: { promptType: ['guardrails', 'auto'] } });
	});

	it('merges show conditions with different keys', () => {
		const result = mergeDisplayOptions(
			{ show: { promptType: ['guardrails'] } },
			{ show: { mode: ['advanced'] } },
		);
		expect(result).toEqual({
			show: { promptType: ['guardrails'], mode: ['advanced'] },
		});
	});

	it('merges hide conditions with same key', () => {
		const result = mergeDisplayOptions(
			{ hide: { resource: ['task'] } },
			{ hide: { resource: ['project'] } },
		);
		expect(result).toEqual({ hide: { resource: ['task', 'project'] } });
	});

	it('merges both show and hide conditions', () => {
		const result = mergeDisplayOptions(
			{ show: { promptType: ['guardrails'] }, hide: { mode: ['simple'] } },
			{ show: { promptType: ['auto'] }, hide: { mode: ['advanced'] } },
		);
		expect(result).toEqual({
			show: { promptType: ['guardrails', 'auto'] },
			hide: { mode: ['simple', 'advanced'] },
		});
	});

	it('adds incoming show conditions when existing has none', () => {
		const result = mergeDisplayOptions({}, { show: { promptType: ['auto'] } });
		expect(result).toEqual({ show: { promptType: ['auto'] } });
	});

	it('adds incoming hide conditions when existing has none', () => {
		const result = mergeDisplayOptions(
			{ show: { promptType: ['guardrails'] } },
			{ hide: { mode: ['advanced'] } },
		);
		expect(result).toEqual({
			show: { promptType: ['guardrails'] },
			hide: { mode: ['advanced'] },
		});
	});

	it('avoids duplicate values when merging', () => {
		const result = mergeDisplayOptions(
			{ show: { promptType: ['guardrails', 'auto'] } },
			{ show: { promptType: ['auto', 'define'] } },
		);
		expect(result).toEqual({
			show: { promptType: ['guardrails', 'auto', 'define'] },
		});
	});

	it('handles object values using JSON comparison', () => {
		const result = mergeDisplayOptions(
			{ show: { complexKey: [{ _cnd: { eq: 'value1' } }] } },
			{ show: { complexKey: [{ _cnd: { eq: 'value2' } }, { _cnd: { eq: 'value1' } }] } },
		);
		expect(result).toEqual({
			show: { complexKey: [{ _cnd: { eq: 'value1' } }, { _cnd: { eq: 'value2' } }] },
		});
	});

	it('preserves existing when incoming is empty', () => {
		const result = mergeDisplayOptions({ show: { promptType: ['guardrails'] } }, {});
		expect(result).toEqual({ show: { promptType: ['guardrails'] } });
	});

	it('handles three-way merge for Agent text field scenario', () => {
		// Simulates the real-world scenario: Agent node has 3 text fields
		let merged: { show?: Record<string, unknown[]>; hide?: Record<string, unknown[]> } = {
			show: { promptType: ['guardrails'] },
		};
		merged = mergeDisplayOptions(merged, { show: { promptType: ['auto'] } });
		merged = mergeDisplayOptions(merged, { show: { promptType: ['define'] } });

		expect(merged).toEqual({
			show: { promptType: ['guardrails', 'auto', 'define'] },
		});
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

		// CommonJS: resolveSchema is included in the require destructure
		expect(code).toContain('resolveSchema }');
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

		// All discriminated schemas export factory functions via CommonJS module.exports
		expect(code).toContain('module.exports = function getSchema');
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

		// CommonJS module.exports for factory function with all helpers as parameters
		expect(code).toContain('module.exports = function getSchema({ parameters, z,');
		expect(code).toContain('resolveSchema }');
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

		// Factory function always has resolveSchema in signature (CommonJS)
		expect(code).toContain('module.exports = function getSchema');
		// But should not import resolveSchema from base.schema if not used in body
		// Check that resolveSchema is not in the require import (not in the function signature)
		expect(code).not.toMatch(/require\([^)]+\).*resolveSchema/);
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

		// Should generate a factory function with all helpers as parameters (CommonJS)
		expect(code).toContain('module.exports = function getSchema({ parameters, z,');
		expect(code).toContain('resolveSchema }');
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

		// Should generate factory function - CommonJS format with helpers from parameters
		expect(code).toContain('module.exports = function getSchema({ parameters, z,');
		expect(code).toContain('const parametersSchema = z.object({');
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

		// Should generate factory function - CommonJS format with helpers from parameters
		expect(code).toContain('module.exports = function getSchema({ parameters, z,');
		// Should NOT contain @version anywhere
		expect(code).not.toContain('@version');
		// Should NOT need resolveSchema since @version displayOptions are stripped
		expect(code).not.toContain('resolveSchema');
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

		// Should generate factory function - CommonJS format with helpers from parameters
		expect(code).toContain('module.exports = function getSchema({ parameters, z,');
		// Should NOT contain @version anywhere
		expect(code).not.toContain('@version');
		// Should NOT need resolveSchema since @version displayOptions are stripped
		expect(code).not.toContain('resolveSchema');
	});
});

describe('generateSubnodeConfigSchemaCode', () => {
	it('generates static schema when AI inputs have no displayOptions', () => {
		const aiInputTypes = [
			{ type: 'ai_languageModel', required: true },
			{ type: 'ai_tool', required: false },
		];

		const code = generateSubnodeConfigSchemaCode(aiInputTypes, 'TestNode');

		// CommonJS exports
		expect(code).toContain('const TestNodeSubnodeConfigSchema = z.object({');
		expect(code).toContain('exports.TestNodeSubnodeConfigSchema = TestNodeSubnodeConfigSchema;');
		expect(code).toContain('model:');
		expect(code).toContain('tools:');
		expect(code).not.toContain('function get');
		expect(code).not.toContain('resolveSchema');
	});

	it('generates factory function when AI inputs have displayOptions (conditional requirements)', () => {
		const aiInputTypes = [
			{
				type: 'ai_languageModel',
				required: true,
				displayOptions: { show: { autoFix: [true] } },
			},
		];

		const code = generateSubnodeConfigSchemaCode(aiInputTypes, 'TestNode');

		// Should generate factory function, not static schema (CommonJS)
		expect(code).toContain('function getTestNodeSubnodeConfigSchema(');
		expect(code).toContain(
			'exports.getTestNodeSubnodeConfigSchema = getTestNodeSubnodeConfigSchema;',
		);
		expect(code).toContain('{ parameters, resolveSchema }');
		expect(code).toContain('return z.object({');
		// Should use resolveSchema for conditional field
		expect(code).toContain('resolveSchema({');
		expect(code).toContain('"autoFix"'); // displayOptions preserved
		expect(code).toContain('required: true');
	});

	it('makes subnodes optional when all required AI inputs have displayOptions', () => {
		// This is the key test for the fix: when ai_languageModel has displayOptions,
		// it's conditionally required, so subnodes should be optional
		const aiInputTypes = [
			{
				type: 'ai_languageModel',
				required: true, // required but conditional
				displayOptions: { show: { autoFix: [true] } },
			},
		];

		const code = generateSubnodeConfigSchemaCode(aiInputTypes, 'TestNode');

		// Should use resolveSchema to make the field conditionally required
		expect(code).toContain('resolveSchema({');
		expect(code).toContain('required: true');
		expect(code).toContain('displayOptions:');
	});

	it('generates static schema for unconditionally required fields without displayOptions', () => {
		const aiInputTypes = [
			{ type: 'ai_languageModel', required: true }, // no displayOptions = unconditionally required
		];

		const code = generateSubnodeConfigSchemaCode(aiInputTypes, 'TestNode');

		// Should generate static schema (CommonJS)
		expect(code).toContain('const TestNodeSubnodeConfigSchema');
		expect(code).toContain('exports.TestNodeSubnodeConfigSchema = TestNodeSubnodeConfigSchema;');
		expect(code).not.toContain('function get');
		// model should NOT be optional
		expect(code).not.toMatch(/model:.*\.optional\(\)/);
	});

	it('handles mixed conditional and unconditional AI inputs', () => {
		const aiInputTypes = [
			{
				type: 'ai_languageModel',
				required: true,
				displayOptions: { show: { autoFix: [true] } }, // conditional
			},
			{ type: 'ai_tool', required: false }, // unconditional
		];

		const code = generateSubnodeConfigSchemaCode(aiInputTypes, 'TestNode');

		// Should generate factory function because of the conditional field (CommonJS)
		expect(code).toContain('function getTestNodeSubnodeConfigSchema(');
		expect(code).toContain(
			'exports.getTestNodeSubnodeConfigSchema = getTestNodeSubnodeConfigSchema;',
		);
		// model uses resolveSchema
		expect(code).toMatch(/model:.*resolveSchema/);
		// tools is optional (static)
		expect(code).toMatch(/tools:.*\.optional\(\)/);
	});
});

describe('hasRequiredSubnodeFields behavior', () => {
	const baseNodeProps = {
		group: ['transform'] as string[],
		inputs: ['main'] as string[],
		outputs: ['main'] as string[],
	};

	it('makes subnodes optional when all required AI inputs have displayOptions', () => {
		const node = {
			...baseNodeProps,
			name: 'n8n-nodes-langchain.outputParserStructured',
			displayName: 'Structured Output Parser',
			version: 1.3,
			properties: [],
		};

		// This simulates the OutputParserStructured node scenario
		const aiInputTypes = [
			{
				type: 'ai_languageModel',
				required: true, // required: true in builderHint
				displayOptions: { show: { autoFix: [true] } }, // but only when autoFix is true
			},
		];

		const code = generateDiscriminatorSchemaFile(node, 1.3, {}, [], 5, aiInputTypes);

		// The subnodes field should be optional because the model is conditionally required
		expect(code).toMatch(/subnodes:.*\.optional\(\)/);
	});

	it('makes subnodes required when an AI input is unconditionally required', () => {
		const node = {
			...baseNodeProps,
			name: 'n8n-nodes-langchain.agent',
			displayName: 'AI Agent',
			version: 1,
			properties: [],
		};

		const aiInputTypes = [
			{
				type: 'ai_languageModel',
				required: true, // unconditionally required (no displayOptions)
			},
			{
				type: 'ai_tool',
				required: false,
			},
		];

		const code = generateDiscriminatorSchemaFile(node, 1, {}, [], 5, aiInputTypes);

		// The subnodes field should NOT be optional because model is unconditionally required
		expect(code).toContain('subnodes:');
		expect(code).not.toMatch(/subnodes:.*\.optional\(\)/);
	});
});

describe('mapPropertyToZodSchema with noDataExpression', () => {
	it('returns z.string() for string type when noDataExpression is true', () => {
		const prop: NodeProperty = {
			name: 'resource',
			displayName: 'Resource',
			type: 'string',
			default: '',
			noDataExpression: true,
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('z.string()');
	});

	it('returns z.number() for number type when noDataExpression is true', () => {
		const prop: NodeProperty = {
			name: 'limit',
			displayName: 'Limit',
			type: 'number',
			default: 10,
			noDataExpression: true,
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('z.number()');
	});

	it('returns z.boolean() for boolean type when noDataExpression is true', () => {
		const prop: NodeProperty = {
			name: 'enabled',
			displayName: 'Enabled',
			type: 'boolean',
			default: false,
			noDataExpression: true,
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('z.boolean()');
	});

	it('returns option literals without expressionSchema when noDataExpression is true', () => {
		const prop: NodeProperty = {
			name: 'resource',
			displayName: 'Resource',
			type: 'options',
			options: [
				{ name: 'Contact', value: 'contact' },
				{ name: 'Deal', value: 'deal' },
			],
			default: 'contact',
			noDataExpression: true,
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toContain("z.literal('contact')");
		expect(schema).toContain("z.literal('deal')");
		expect(schema).not.toContain('expressionSchema');
	});

	it('returns z.string() for dateTime type when noDataExpression is true', () => {
		const prop: NodeProperty = {
			name: 'date',
			displayName: 'Date',
			type: 'dateTime',
			default: '',
			noDataExpression: true,
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('z.string()');
	});

	it('returns z.string() for color type when noDataExpression is true', () => {
		const prop: NodeProperty = {
			name: 'color',
			displayName: 'Color',
			type: 'color',
			default: '#000000',
			noDataExpression: true,
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('z.string()');
	});

	it('returns z.string() for dynamic options when noDataExpression is true', () => {
		const prop: NodeProperty = {
			name: 'field',
			displayName: 'Field',
			type: 'options',
			default: '',
			noDataExpression: true,
			typeOptions: { loadOptionsMethod: 'getFields' },
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('z.string()');
	});

	it('still returns stringOrExpression when noDataExpression is false', () => {
		const prop: NodeProperty = {
			name: 'url',
			displayName: 'URL',
			type: 'string',
			default: '',
			noDataExpression: false,
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('stringOrExpression');
	});

	it('still returns stringOrExpression when noDataExpression is undefined', () => {
		const prop: NodeProperty = {
			name: 'url',
			displayName: 'URL',
			type: 'string',
			default: '',
		};
		const schema = mapPropertyToZodSchema(prop);
		expect(schema).toBe('stringOrExpression');
	});
});
