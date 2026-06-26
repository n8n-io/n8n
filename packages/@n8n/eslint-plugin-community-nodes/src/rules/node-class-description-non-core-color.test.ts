import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeClassDescriptionNonCoreColorRule } from './node-class-description-non-core-color.js';

const ruleTester = new RuleTester();

const nodeFilePath = '/tmp/TestNode.node.ts';
const nonNodeFilePath = '/tmp/helper.ts';

function createNodeCode(defaultsBody: string, topLevel = ''): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Test Node',
    name: 'testNode',
    group: ['input'],
    version: 1,
    description: 'A test node',
    defaults: { name: 'Test Node'${defaultsBody} },${topLevel}
    inputs: [],
    outputs: [],
    properties: [],
  };
}`;
}

ruleTester.run('node-class-description-non-core-color', NodeClassDescriptionNonCoreColorRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			code: 'export class Foo { description = { defaults: { color: "#FF6D5A" } }; }',
			filename: nodeFilePath,
		},
		{
			name: 'core color in a non-.node.ts file is ignored',
			code: createNodeCode(", color: '#FF6D5A'"),
			filename: nonNodeFilePath,
		},
		{
			name: 'node without any color',
			code: createNodeCode(''),
			filename: nodeFilePath,
		},
		{
			name: 'node with a custom color in defaults',
			code: createNodeCode(", color: '#1A82E2'"),
			filename: nodeFilePath,
		},
		{
			name: 'node with a custom top-level color',
			code: createNodeCode('', "\n    color: '#00BFA5',"),
			filename: nodeFilePath,
		},
	],
	invalid: [
		{
			name: 'core color in defaults',
			code: createNodeCode(", color: '#FF6D5A'"),
			filename: nodeFilePath,
			errors: [{ messageId: 'coreColor', data: { color: '#FF6D5A' } }],
		},
		{
			name: 'core color in defaults, lowercase',
			code: createNodeCode(", color: '#ff6d5a'"),
			filename: nodeFilePath,
			errors: [{ messageId: 'coreColor', data: { color: '#ff6d5a' } }],
		},
		{
			name: 'core color at top level',
			code: createNodeCode('', "\n    color: '#FF6D5A',"),
			filename: nodeFilePath,
			errors: [{ messageId: 'coreColor', data: { color: '#FF6D5A' } }],
		},
	],
});
