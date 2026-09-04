import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoUnsafeConnectionTypeCastRule } from './no-unsafe-connection-type-cast.js';

const ruleTester = new RuleTester();

function createNodeCode(inputs: string, outputs: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: ${inputs},
		outputs: ${outputs},
		properties: [],
	};
}`;
}

/** Lets a test spell the connection key itself, e.g. `'inputs'` or `['inputs']`. */
function createNodeCodeWithProperty(property: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		${property},
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};
}`;
}

/** `description = { … } as INodeTypeDescription` — a widely used node layout. */
function createTypeAssertedNodeCode(inputs: string, outputs: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: ${inputs},
		outputs: ${outputs},
		properties: [],
	} as INodeTypeDescription;
}`;
}

/**
 * Versioned node layout from the node-building docs: the version class assigns
 * `description` in its constructor instead of as a property initializer.
 */
function createVersionedNodeCode(inputs: string, outputs: string): string {
	return `
import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class TestNodeV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Test Node',
			name: 'testNode',
			group: ['input'],
			version: 1,
			description: 'A test node',
			defaults: { name: 'Test Node' },
			inputs: ${inputs},
			outputs: ${outputs},
			properties: [],
		};
	}
}`;
}

const MAIN = '[NodeConnectionTypes.Main]';

ruleTester.run('no-unsafe-connection-type-cast', NoUnsafeConnectionTypeCastRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			code: 'export class RegularClass {\n\tsomeProperty = "value";\n}',
		},
		{
			name: 'node without casts',
			code: createNodeCode(MAIN, MAIN),
		},
		{
			name: 'node with empty inputs and outputs',
			code: createNodeCode('[]', '[]'),
		},
		{
			name: 'dynamic inputs as a template literal expression',
			code: createNodeCode('`={{ (() => [NodeConnectionTypes.Main])() }}`', MAIN),
		},
		{
			name: 'as const narrows rather than erases',
			code: createNodeCode(`${MAIN} as const`, MAIN),
		},
		{
			name: 'satisfies keeps the type checked',
			code: createNodeCode(`${MAIN} satisfies NodeConnectionType[]`, MAIN),
		},
		{
			name: 'a named type assertion is still checked structurally',
			code: createNodeCode(`${MAIN} as NodeConnectionType[]`, MAIN),
		},
		{
			name: 'casts elsewhere in the description are untouched',
			code: createNodeCode(MAIN, MAIN).replace('version: 1,', 'version: 1 as never,'),
		},
	],
	invalid: [
		{
			name: 'as never on inputs',
			code: createNodeCode("['main'] as never", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main']", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'as never on outputs',
			code: createNodeCode(MAIN, "['main'] as never"),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'outputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode(MAIN, "['main']"),
						},
					],
				},
			],
		},
		{
			name: 'as never on both inputs and outputs',
			code: createNodeCode("['main'] as never", "['main'] as never"),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main']", "['main'] as never"),
						},
					],
				},
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'outputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main'] as never", "['main']"),
						},
					],
				},
			],
		},
		{
			name: 'as any',
			code: createNodeCode("['main'] as any", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'any', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main']", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'as unknown',
			code: createNodeCode("['main'] as unknown", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'unknown', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main']", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'double cast through unknown removes the whole chain',
			code: createNodeCode("['main'] as unknown as NodeConnectionType[]", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'unknown', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main']", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'angle-bracket assertion',
			code: createNodeCode("<never>['main']", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main']", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'erasing cast hidden behind an outer satisfies',
			code: createNodeCode("['main'] as never satisfies NodeConnectionType[]", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main'] satisfies NodeConnectionType[]", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'erasing cast wrapped around an inner satisfies',
			code: createNodeCode("['main'] satisfies NodeConnectionType[] as never", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("['main'] satisfies NodeConnectionType[]", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'cast nested under satisfies, with a second cast outside it',
			code: createNodeCode("['main'] as never satisfies NodeConnectionType[] as unknown", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'unknown', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							// Both casts go, the satisfies between them stays.
							output: createNodeCode("['main'] satisfies NodeConnectionType[]", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'quoted connection key',
			code: createNodeCodeWithProperty("'inputs': ['main'] as never"),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCodeWithProperty("'inputs': ['main']"),
						},
					],
				},
			],
		},
		{
			name: 'computed connection key',
			code: createNodeCodeWithProperty("['inputs']: ['main'] as never"),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCodeWithProperty("['inputs']: ['main']"),
						},
					],
				},
			],
		},
		{
			name: 'cast hiding a malformed declaration',
			code: createNodeCode("'not-an-array' as never", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createNodeCode("'not-an-array'", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'as never on inputs of a type-asserted description',
			code: createTypeAssertedNodeCode("['main'] as never", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createTypeAssertedNodeCode("['main']", MAIN),
						},
					],
				},
			],
		},
		{
			name: 'as never on inputs of a versioned node assigning description in its constructor',
			code: createVersionedNodeCode("['main'] as never", MAIN),
			errors: [
				{
					messageId: 'erasingCast',
					data: { typeName: 'never', property: 'inputs' },
					suggestions: [
						{
							messageId: 'removeCast',
							output: createVersionedNodeCode("['main']", MAIN),
						},
					],
				},
			],
		},
	],
});
