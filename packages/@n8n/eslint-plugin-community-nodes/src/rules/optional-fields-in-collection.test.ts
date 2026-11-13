import { Linter } from 'eslint';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const linter = new Linter();
const ruleId = '@n8n/community-nodes/optional-fields-in-collection';
const optionalFields = `
	{ displayName: 'Email', name: 'email', type: 'string', default: '' },
	{ displayName: 'Name', name: 'name', type: 'string', required: false, default: '' },
	{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
`;

function createNodeCode(properties: string): string {
	return `
export class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		inputs: ['main'],
		outputs: ['main'],
		properties: [${properties}],
	};
}`;
}

function lintNode(code: string, config: keyof typeof configs) {
	const messages = linter.verify(code, [{ ...configs[config], files: ['**/*.node.ts'] }], {
		filename: 'src/rules/TestNode.node.ts',
	});

	expect(messages.filter((message) => message.fatal || message.ruleId === null)).toEqual([]);

	return messages;
}

function expectedWarnings() {
	return ['email', 'name', 'phone'].map((name) =>
		expect.objectContaining({
			ruleId,
			severity: 1,
			message: `Optional parameter \`${name}\` sits at the top level of the node form. Optional parameters belong inside an \`Additional Fields\` or \`Options\` collection so the default view shows only what the operation requires.`,
		}),
	);
}

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s optional fields in collections',
	(config) => {
		it('runs node rules on the fixture', () => {
			expect(lintNode(createNodeCode(''), config)).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						ruleId: '@n8n/community-nodes/require-node-description-fields',
						messageId: 'missingFields',
					}),
				]),
			);
		});

		// CE-3539: Optional fields must not fill the default node form.
		it('warns about each top-level optional field', () => {
			const messages = lintNode(createNodeCode(optionalFields), config);

			expect(messages.filter((message) => message.ruleId === ruleId)).toEqual(expectedWarnings());
		});

		it('warns about optional fields spread into description.properties', () => {
			const code = `
export const sharedFields = [${optionalFields}];
${createNodeCode('...sharedFields')}`;

			expect(lintNode(code, config).filter((message) => message.ruleId === ruleId)).toEqual(
				expectedWarnings(),
			);
		});

		it('accepts optional fields inside an Options collection', () => {
			const code = createNodeCode(`{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [${optionalFields}],
			}`);

			expect(lintNode(code, config).filter((message) => message.ruleId === ruleId)).toEqual([]);
		});

		it('accepts module-level optional fields spread into a collection', () => {
			const code = `
export const sharedFields = [${optionalFields}];
${createNodeCode(`{
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	options: [...sharedFields],
}`)}`;

			expect(lintNode(code, config).filter((message) => message.ruleId === ruleId)).toEqual([]);
		});

		it('accepts optional fields inside a fixed collection', () => {
			const code = createNodeCode(`{
				displayName: 'Options',
				name: 'options',
				type: 'fixedCollection',
				default: {},
				options: [{ name: 'contact', displayName: 'Contact', values: [${optionalFields}] }],
			}`);

			expect(lintNode(code, config).filter((message) => message.ruleId === ruleId)).toEqual([]);
		});

		it('accepts conventional fields, required fields, mode pickers, and notices', () => {
			const code = createNodeCode(`
				{ displayName: 'Resource', name: 'resource', type: 'options', default: 'contact',
					options: [{ name: 'Contact', value: 'contact' }] },
				{ displayName: 'Operation', name: 'operation', type: 'options', default: 'get',
					options: [{ name: 'Get', value: 'get', action: 'Get a contact' }] },
				{ displayName: 'Return All', name: 'returnAll', type: 'boolean', default: false },
				{ displayName: 'Limit', name: 'limit', type: 'number', default: 50 },
				{ displayName: 'Simplify', name: 'simplify', type: 'boolean', default: true },
				{ displayName: 'Authentication', name: 'authentication', type: 'options', default: 'apiKey',
					options: [{ name: 'API Key', value: 'apiKey' }] },
				{ displayName: 'Contact ID', name: 'contactId', type: 'string', required: true, default: '' },
				{ displayName: 'Mode', name: 'mode', type: 'options', noDataExpression: true, default: 'manual',
					options: [{ name: 'Manual', value: 'manual' }] },
				{ displayName: 'Choose a contact to continue', name: 'notice', type: 'notice', default: '' },
			`);

			expect(lintNode(code, config).filter((message) => message.ruleId === ruleId)).toEqual([]);
		});

		it('does not inspect classes that are not nodes', () => {
			const code = `class Helper {
				description = { properties: [${optionalFields}] };
			}`;

			expect(lintNode(code, config).filter((message) => message.ruleId === ruleId)).toEqual([]);
		});
	},
);

const exportRoutes: Array<{ name: string; modules: Record<string, string> }> = [
	{ name: 'direct imports', modules: {} },
	{
		name: 'wildcard re-exports',
		modules: { 'index.ts': "export * from './fields';" },
	},
	{
		name: 'named re-exports',
		modules: { 'index.ts': "export { contactFields } from './fields.js';" },
	},
	{
		name: 'aliased re-exports',
		modules: {
			'index.ts': "export { renamedFields as contactFields } from './barrel.js';",
			'barrel.ts': "export { contactFields as renamedFields } from './fields';",
		},
	},
	{
		name: 'local export aliases',
		modules: {
			'index.ts': `import { contactFields as fields } from './fields';
				export { fields as contactFields };`,
		},
	},
	{
		name: 'nested wildcard and named re-exports',
		modules: {
			'index.ts': "export * from './barrel';",
			'barrel.ts': "export * from './nested.js';",
			'nested.ts': "export { contactFields } from './fields';",
		},
	},
	{
		name: 'cyclic wildcard re-exports',
		modules: {
			'index.ts': "export * from './barrel'; export * from './fields';",
			'barrel.ts': "export * from './index';",
		},
	},
];

describe.each(exportRoutes)('exported field arrays through $name', ({ modules }) => {
	it.each([
		{
			name: 'reports fields imported into description.properties',
			properties: '...contactFields',
			expected: expectedWarnings(),
		},
		{
			name: 'accepts imported fields inside a collection',
			properties: `{
				displayName: 'Options', name: 'options', type: 'collection', default: {},
				options: [...contactFields],
			}`,
			expected: [],
		},
		{
			name: 'accepts exported arrays that the node form does not use',
			properties: '',
			expected: [],
		},
	])('$name', ({ properties, expected }) => {
		const directory = mkdtempSync(path.join(tmpdir(), 'n8n-optional-fields-'));
		try {
			const nodes = path.join(directory, 'nodes');
			mkdirSync(nodes);
			writeFileSync(path.join(directory, 'package.json'), '{}');
			const filename = path.join(nodes, 'ContactDescription.ts');
			const code = `export const sharedFields = [${optionalFields}];`;
			writeFileSync(filename, code);
			writeFileSync(
				path.join(nodes, 'fields.ts'),
				`import { sharedFields as fields } from './ContactDescription.js';
				export const contactFields: INodeProperties[] = [...fields];`,
			);
			for (const [moduleFilename, moduleCode] of Object.entries(modules)) {
				writeFileSync(path.join(nodes, moduleFilename), moduleCode);
			}
			const importSource = Object.keys(modules).length ? './index' : './fields';
			writeFileSync(
				path.join(nodes, 'TestNode.node.ts'),
				`import { contactFields } from '${importSource}'; ${createNodeCode(properties)}`,
			);

			const messages = new Linter({ cwd: directory }).verify(
				code,
				[
					{
						...configs.recommended,
						files: ['**/*.ts'],
						rules: { [ruleId]: 'warn' },
					},
				],
				{ filename },
			);
			expect(messages).toEqual(expected);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
