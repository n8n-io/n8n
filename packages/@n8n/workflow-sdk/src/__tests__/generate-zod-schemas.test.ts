import {
	generateConditionalSchemaLine,
	generateSingleVersionSchemaFile,
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
