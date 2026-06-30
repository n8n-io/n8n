import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeConnectionTypeLiteralRule } from './node-connection-type-literal.js';

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

function createNodeCodeNoImport(inputs: string, outputs: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

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

function createNonNodeClass(): string {
	return `
export class RegularClass {
	someProperty = 'value';
}`;
}

ruleTester.run('node-connection-type-literal', NodeConnectionTypeLiteralRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			code: createNonNodeClass(),
		},
		{
			name: 'node with enum in inputs and outputs',
			code: createNodeCode('[NodeConnectionTypes.Main]', '[NodeConnectionTypes.Main]'),
		},
		{
			name: 'node with empty inputs and outputs',
			code: createNodeCode('[]', '[]'),
		},
		{
			name: 'node with AI enum in inputs',
			code: createNodeCode('[NodeConnectionTypes.AiAgent]', '[NodeConnectionTypes.Main]'),
		},
		{
			name: 'node with multiple enum values',
			code: createNodeCode(
				'[NodeConnectionTypes.Main]',
				'[NodeConnectionTypes.AiAgent, NodeConnectionTypes.AiTool]',
			),
		},
	],
	invalid: [
		{
			name: 'string literal "main" in inputs',
			code: createNodeCodeNoImport("['main']", '[NodeConnectionTypes.Main]'),
			errors: [{ messageId: 'stringLiteralInInputs', data: { value: 'main', enumKey: 'Main' } }],
			output: createNodeCodeNoImport('[NodeConnectionTypes.Main]', '[NodeConnectionTypes.Main]'),
		},
		{
			name: 'string literal "main" in outputs',
			code: createNodeCodeNoImport('[NodeConnectionTypes.Main]', "['main']"),
			errors: [{ messageId: 'stringLiteralInOutputs', data: { value: 'main', enumKey: 'Main' } }],
			output: createNodeCodeNoImport('[NodeConnectionTypes.Main]', '[NodeConnectionTypes.Main]'),
		},
		{
			name: 'string literals in both inputs and outputs',
			code: createNodeCodeNoImport("['main']", "['main']"),
			errors: [
				{ messageId: 'stringLiteralInInputs', data: { value: 'main', enumKey: 'Main' } },
				{ messageId: 'stringLiteralInOutputs', data: { value: 'main', enumKey: 'Main' } },
			],
			output: createNodeCodeNoImport('[NodeConnectionTypes.Main]', '[NodeConnectionTypes.Main]'),
		},
		{
			name: 'string literal "ai_agent" in inputs',
			code: createNodeCodeNoImport("['ai_agent']", '[]'),
			errors: [
				{ messageId: 'stringLiteralInInputs', data: { value: 'ai_agent', enumKey: 'AiAgent' } },
			],
			output: createNodeCodeNoImport('[NodeConnectionTypes.AiAgent]', '[]'),
		},
		{
			name: 'unknown string literal in inputs — no autofix',
			code: createNodeCodeNoImport("['unknown_type']", '[]'),
			errors: [{ messageId: 'unknownStringLiteralInInputs', data: { value: 'unknown_type' } }],
			output: null,
		},
		{
			name: 'unknown string literal in outputs — no autofix',
			code: createNodeCodeNoImport('[]', "['unknown_type']"),
			errors: [{ messageId: 'unknownStringLiteralInOutputs', data: { value: 'unknown_type' } }],
			output: null,
		},
		{
			name: 'string literal in node that already imports NodeConnectionTypes',
			code: createNodeCode("['main']", '[NodeConnectionTypes.Main]'),
			errors: [{ messageId: 'stringLiteralInInputs', data: { value: 'main', enumKey: 'Main' } }],
			output: createNodeCode('[NodeConnectionTypes.Main]', '[NodeConnectionTypes.Main]'),
		},
	],
});
