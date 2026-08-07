import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeUsableAsToolRule } from './node-usable-as-tool.js';

const ruleTester = new RuleTester();

function createNodeCode(
	usableAsTool?: boolean | 'missing',
	hasDescription: boolean = true,
): string {
	let usableAsToolProperty = '';
	if (usableAsTool === true) {
		usableAsToolProperty = ',\n\t\tusableAsTool: true';
	} else if (usableAsTool === false) {
		usableAsToolProperty = ',\n\t\tusableAsTool: false';
	}

	if (!hasDescription) {
		return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	displayName = 'Test Node';
}`;
	}

	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: {
			name: 'Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: []${usableAsToolProperty},
	};
}`;
}

function createNonNodeClass(): string {
	return `
export class RegularClass {
	someProperty = 'value';
}`;
}

function createNodeCodeWithOutputsInputs(
	outputs: string,
	inputs: string,
	includeUsableAsTool = false,
): string {
	const usableAsToolLine = includeUsableAsTool ? '\n\t\tusableAsTool: true,' : '';
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
		defaults: {
			name: 'Test Node',
		},
		inputs: ${inputs},
		outputs: ${outputs},
		properties: [],${usableAsToolLine}
	};
}`;
}

ruleTester.run('node-usable-as-tool', NodeUsableAsToolRule, {
	valid: [
		{
			name: 'node with usableAsTool set to true',
			code: createNodeCode(true),
		},
		{
			name: 'class that does not implement INodeType',
			code: createNonNodeClass(),
		},
		{
			name: 'node with usableAsTool set to false',
			code: createNodeCode(false),
		},
		{
			name: 'node without description property',
			code: createNodeCode(undefined, false),
		},
		{
			name: 'AI-only node: NodeConnectionTypes non-Main output and empty inputs skips usableAsTool check',
			code: createNodeCodeWithOutputsInputs('[NodeConnectionTypes.AiAgent]', '[]'),
		},
		{
			name: 'AI-only node: multiple non-Main NodeConnectionTypes outputs and empty inputs skips usableAsTool check',
			code: createNodeCodeWithOutputsInputs(
				'[NodeConnectionTypes.AiAgent, NodeConnectionTypes.AiTool]',
				'[]',
			),
		},
		{
			name: 'AI-only node: non-main string literal output and empty inputs skips usableAsTool check',
			code: createNodeCodeWithOutputsInputs("['ai_agent']", '[]'),
		},
	],
	invalid: [
		{
			name: 'node missing usableAsTool property',
			code: createNodeCode('missing'),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCode(true),
		},
		{
			name: 'NodeConnectionTypes.Main output with empty inputs does not skip check',
			code: createNodeCodeWithOutputsInputs('[NodeConnectionTypes.Main]', '[]'),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCodeWithOutputsInputs('[NodeConnectionTypes.Main]', '[]', true),
		},
		{
			name: 'main string literal output with empty inputs does not skip check',
			code: createNodeCodeWithOutputsInputs("['main']", '[]'),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCodeWithOutputsInputs("['main']", '[]', true),
		},
		{
			name: 'non-Main output with non-empty inputs does not skip check',
			code: createNodeCodeWithOutputsInputs('[NodeConnectionTypes.AiAgent]', "['main']"),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCodeWithOutputsInputs('[NodeConnectionTypes.AiAgent]', "['main']", true),
		},
		{
			name: 'non-main string literal output with non-empty inputs does not skip check',
			code: createNodeCodeWithOutputsInputs("['ai_agent']", "['main']"),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCodeWithOutputsInputs("['ai_agent']", "['main']", true),
		},
	],
});
