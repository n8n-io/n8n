import { RuleTester } from '@typescript-eslint/rule-tester';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { CodexNodeNameRule, findNodeName } from './codex-node-name.js';

const fixturesDir = mkdtempSync(join(tmpdir(), 'n8n-codex-node-name-'));

afterAll(() => {
	rmSync(fixturesDir, { recursive: true, force: true });
});

let packageCount = 0;

/**
 * Writes a package to disk, since the rule reads "n8n.nodes" and the node
 * files from there
 */
function createPackage(
	packageName: string,
	nodes: string[],
	files: Record<string, string>,
): (relativePath: string) => string {
	const packageDir = join(fixturesDir, `package-${++packageCount}`);
	writeFile(
		join(packageDir, 'package.json'),
		JSON.stringify({ name: packageName, n8n: { nodes } }),
	);
	for (const [relativePath, content] of Object.entries(files)) {
		writeFile(join(packageDir, relativePath), content);
	}
	return (relativePath) => join(packageDir, relativePath);
}

function writeFile(filePath: string, content: string) {
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, content);
}

const nodeSource = (className: string, name: string) => nodeSourceWithName(className, `'${name}'`);

/** A node whose description `name` is the given expression */
const nodeSourceWithName = (className: string, nameExpression: string) => `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ${className} implements INodeType {
	description: INodeTypeDescription = {
		displayName: '${className}',
		name: ${nameExpression},
		group: ['transform'],
		version: 1,
		inputs: [],
		outputs: ['main'],
		properties: [],
	};
}
`;

/** `tsc` output for a node class */
const compiledNode = (className: string, name: string) => `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.${className} = void 0;
class ${className} {
    constructor() {
        this.description = {
            displayName: '${className}',
            name: '${name}',
            version: 1,
            properties: [],
        };
    }
}
exports.${className} = ${className};
`;

const codex = (node?: string) => JSON.stringify(node === undefined ? {} : { node });

/**
 * The Luma package from a source checkout: an action node and a trigger,
 * registered by their compiled paths
 */
function lumaPackage(actionCodex?: string, triggerCodex?: string, packageName = 'n8n-nodes-luma') {
	const file = createPackage(
		packageName,
		['dist/nodes/Luma/Luma.node.js', 'dist/nodes/LumaTrigger/LumaTrigger.node.js'],
		{
			'nodes/Luma/Luma.node.ts': nodeSource('Luma', 'luma'),
			'nodes/Luma/Luma.node.json': codex(actionCodex),
			'nodes/LumaTrigger/LumaTrigger.node.ts': nodeSource('LumaTrigger', 'lumaTrigger'),
			'nodes/LumaTrigger/LumaTrigger.node.json': codex(triggerCodex),
		},
	);
	return {
		action: { filename: file('nodes/Luma/Luma.node.json'), code: codex(actionCodex) },
		trigger: {
			filename: file('nodes/LumaTrigger/LumaTrigger.node.json'),
			code: codex(triggerCodex),
		},
	};
}

/**
 * A package whose source was renamed to `luma` after the last build, so
 * "dist" still holds `oldLuma`
 */
function staleDistPackage(sourceCodex: string, distCodex: string) {
	const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
		'dist/nodes/Luma/Luma.node.js': compiledNode('Luma', 'oldLuma'),
		'dist/nodes/Luma/Luma.node.json': codex(distCodex),
		'nodes/Luma/Luma.node.ts': nodeSource('Luma', 'luma'),
		'nodes/Luma/Luma.node.json': codex(sourceCodex),
	});
	return {
		source: { filename: file('nodes/Luma/Luma.node.json'), code: codex(sourceCodex) },
		dist: { filename: file('dist/nodes/Luma/Luma.node.json'), code: codex(distCodex) },
	};
}

const ruleTester = new RuleTester();

ruleTester.run('codex-node-name', CodexNodeNameRule, {
	valid: [
		{
			name: 'action node',
			...lumaPackage('n8n-nodes-luma.luma', 'n8n-nodes-luma.lumaTrigger').action,
		},
		{
			name: 'trigger node',
			...lumaPackage('n8n-nodes-luma.luma', 'n8n-nodes-luma.lumaTrigger').trigger,
		},
		{
			name: 'scoped package',
			...lumaPackage(
				'@acme/n8n-nodes-luma.luma',
				'@acme/n8n-nodes-luma.lumaTrigger',
				'@acme/n8n-nodes-luma',
			).trigger,
		},
		(() => {
			const code = codex('n8n-nodes-luma.lumaTrigger');
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/LumaTrigger/LumaTrigger.node.js'], {
				'dist/nodes/LumaTrigger/LumaTrigger.node.js': compiledNode('LumaTrigger', 'lumaTrigger'),
				'dist/nodes/LumaTrigger/LumaTrigger.node.json': code,
			});
			return {
				name: 'published package with a compiled node',
				filename: file('dist/nodes/LumaTrigger/LumaTrigger.node.json'),
				code,
			};
		})(),
		(() => {
			const code = codex('n8n-nodes-luma');
			const file = createPackage('n8n-nodes-luma', [], {
				'nodes/Luma/Luma.node.ts': nodeSource('Luma', 'luma'),
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'codex of a node missing from "n8n.nodes"',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
			};
		})(),
		(() => {
			const code = codex('n8n-nodes-luma.anything');
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'only the package prefix is checked when the node file is missing',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
			};
		})(),
		(() => {
			const code = codex('n8n-nodes-luma.anything');
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
				'nodes/Luma/Luma.node.ts': nodeSourceWithName('Luma', '123'),
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'only the package prefix is checked when the name is not a string',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
			};
		})(),
		(() => {
			const code = codex('n8n-nodes-luma');
			const file = createPackage(
				'n8n-nodes-luma',
				['dist/nodes/LumaTrigger/LumaTrigger.node.cjs'],
				{
					'dist/nodes/LumaTrigger/LumaTrigger.node.cjs': compiledNode('LumaTrigger', 'lumaTrigger'),
					'dist/nodes/LumaTrigger/LumaTrigger.node.json': code,
				},
			);
			return {
				name: '.node.json next to a .cjs node, which n8n reads as .node.cjson',
				filename: file('dist/nodes/LumaTrigger/LumaTrigger.node.json'),
				code,
			};
		})(),
		{
			name: 'source codex judged by the source node when "dist" is stale',
			...staleDistPackage('n8n-nodes-luma.luma', 'n8n-nodes-luma.oldLuma').source,
		},
		{
			name: 'dist codex judged by the compiled node',
			...staleDistPackage('n8n-nodes-luma.luma', 'n8n-nodes-luma.oldLuma').dist,
		},
		(() => {
			const code = codex('n8n-nodes-luma');
			const file = createPackage('n8n-nodes-luma', ['../Luma.node.js'], {
				'Luma.node.json': code,
			});
			return {
				name: '"n8n.nodes" entry outside the package',
				filename: file('Luma.node.json'),
				code,
			};
		})(),
		{
			name: 'unrelated JSON file',
			filename: 'package.json',
			code: codex('n8n-nodes-luma'),
		},
	],
	invalid: [
		(() => {
			const code = codex('n8n-nodes-luma');
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
				'nodes/Luma/Luma.node.ts': nodeSourceWithName('Luma', '123'),
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'package name only when the name is not a string',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
				errors: [{ messageId: 'wrongNode' as const }],
				output: null,
			};
		})(),
		{
			name: 'source codex with the stale name from "dist"',
			...staleDistPackage('n8n-nodes-luma.oldLuma', 'n8n-nodes-luma.oldLuma').source,
			errors: [
				{
					messageId: 'wrongNode' as const,
					data: { actual: 'n8n-nodes-luma.oldLuma', expected: 'n8n-nodes-luma.luma' },
				},
			],
			output: codex('n8n-nodes-luma.luma'),
		},
		{
			name: 'dist codex with the name from the source',
			...staleDistPackage('n8n-nodes-luma.luma', 'n8n-nodes-luma.luma').dist,
			errors: [
				{
					messageId: 'wrongNode' as const,
					data: { actual: 'n8n-nodes-luma.luma', expected: 'n8n-nodes-luma.oldLuma' },
				},
			],
			output: codex('n8n-nodes-luma.oldLuma'),
		},
		{
			name: 'package name only',
			...lumaPackage('n8n-nodes-luma', 'n8n-nodes-luma').trigger,
			errors: [
				{
					messageId: 'wrongNode',
					data: { actual: 'n8n-nodes-luma', expected: 'n8n-nodes-luma.lumaTrigger' },
				},
			],
			output: codex('n8n-nodes-luma.lumaTrigger'),
		},
		{
			name: 'scoped package name only',
			...lumaPackage('@acme/n8n-nodes-luma', '@acme/n8n-nodes-luma', '@acme/n8n-nodes-luma').action,
			errors: [{ messageId: 'wrongNode' }],
			output: codex('@acme/n8n-nodes-luma.luma'),
		},
		{
			name: 'trigger reusing the action node name',
			...lumaPackage('n8n-nodes-luma.luma', 'n8n-nodes-luma.luma').trigger,
			errors: [{ messageId: 'wrongNode' }],
			output: codex('n8n-nodes-luma.lumaTrigger'),
		},
		{
			name: 'class name instead of the description name',
			...lumaPackage('n8n-nodes-luma.Luma', 'n8n-nodes-luma.LumaTrigger').trigger,
			errors: [{ messageId: 'wrongNode' }],
			output: codex('n8n-nodes-luma.lumaTrigger'),
		},
		{
			name: 'wrong package prefix',
			...lumaPackage('n8n-nodes-other.luma', 'n8n-nodes-other.lumaTrigger').action,
			errors: [{ messageId: 'wrongNode' }],
			output: codex('n8n-nodes-luma.luma'),
		},
		{
			name: 'missing node field',
			...lumaPackage(undefined, undefined).trigger,
			errors: [{ messageId: 'missingNode', data: { expected: 'n8n-nodes-luma.lumaTrigger' } }],
			output: '{"node": "n8n-nodes-luma.lumaTrigger"}',
		},
		(() => {
			const code = '{"categories":["Development"]}';
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
				'nodes/Luma/Luma.node.ts': nodeSource('Luma', 'luma'),
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'missing node field next to other fields',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
				errors: [{ messageId: 'missingNode' as const }],
				output: '{"node": "n8n-nodes-luma.luma","categories":["Development"]}',
			};
		})(),
		(() => {
			const code = '{\n\t"categories": ["Development"]\n}\n';
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
				'nodes/Luma/Luma.node.ts': nodeSource('Luma', 'luma'),
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'missing node field in a formatted codex',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
				errors: [{ messageId: 'missingNode' as const }],
				output: '{\n\t"node": "n8n-nodes-luma.luma",\n\t"categories": ["Development"]\n}\n',
			};
		})(),
		(() => {
			const code = codex();
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'missing node field when the node file is missing',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
				errors: [{ messageId: 'missingNode' as const }],
				output: null,
			};
		})(),
		(() => {
			const code = codex('n8n-nodes-luma');
			const file = createPackage('n8n-nodes-luma', ['dist/nodes/Luma/Luma.node.js'], {
				'nodes/Luma/Luma.node.json': code,
			});
			return {
				name: 'package name only when the node file is missing',
				filename: file('nodes/Luma/Luma.node.json'),
				code,
				errors: [{ messageId: 'wrongNode' as const }],
				output: null,
			};
		})(),
	],
});

describe('findNodeName', () => {
	it('reads the description name, not the class name', () => {
		const file = createPackage('n8n-nodes-luma', [], {
			'LumaTrigger.node.ts': nodeSource('LumaTrigger', 'lumaTrigger'),
		});
		expect(findNodeName(file('LumaTrigger.node.ts'))).toBe('lumaTrigger');
	});

	it('reads the name from a versioned node base description', () => {
		const file = createPackage('n8n-nodes-luma', [], {
			'Luma.node.ts': `
				export class Luma extends VersionedNodeType {
					constructor() {
						const baseDescription = { displayName: 'Luma', name: 'luma', defaultVersion: 2 };
						super({}, baseDescription);
					}
				}
			`,
		});
		expect(findNodeName(file('Luma.node.ts'))).toBe('luma');
	});

	it('ignores objects that are not a node description', () => {
		const file = createPackage('n8n-nodes-luma', [], {
			'Luma.node.ts': `
				const option = { name: 'Create', value: 'create' };
				export class Luma { description = { displayName: 'Luma', name: 'luma', version: 1 }; }
			`,
		});
		expect(findNodeName(file('Luma.node.ts'))).toBe('luma');
	});
});
