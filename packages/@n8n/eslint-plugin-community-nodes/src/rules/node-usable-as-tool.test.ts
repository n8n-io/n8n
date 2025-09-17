import { RuleTester } from '@typescript-eslint/rule-tester';
import { NodeUsableAsToolRule } from './node-usable-as-tool.js';

const ruleTester = new RuleTester();

// Helper function to create node class code
function createNodeCode(properties: string[]): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
${properties.map((prop) => `\t${prop}`).join('\n')}
}`;
}

// Helper to create a property string
function createProperty(name: string, value: string): string {
	return `${name} = ${value};`;
}

ruleTester.run('node-usable-as-tool', NodeUsableAsToolRule, {
	valid: [
		{
			// Node with usableAsTool set to true
			code: createNodeCode([
				createProperty('description', '{ displayName: "Test Node" }'),
				createProperty('usableAsTool', 'true'),
			]),
		},
		{
			// Class that doesn't implement INodeType
			code: `
export class RegularClass {
	someProperty = 'value';
}`,
		},
		{
			// Node with usableAsTool at the beginning
			code: createNodeCode([
				createProperty('usableAsTool', 'true'),
				createProperty('description', '{ displayName: "Test Node" }'),
			]),
		},
	],
	invalid: [
		{
			// Node missing usableAsTool property
			code: createNodeCode([createProperty('description', '{ displayName: "Test Node" }')]),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCode([
				createProperty('description', '{ displayName: "Test Node" }'),
				createProperty('usableAsTool', 'true'),
			]),
		},
		{
			// Node with usableAsTool set to false
			code: createNodeCode([
				createProperty('description', '{ displayName: "Test Node" }'),
				createProperty('usableAsTool', 'false'),
			]),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCode([
				createProperty('description', '{ displayName: "Test Node" }'),
				createProperty('usableAsTool', 'true'),
			]),
		},
		{
			// Node without description property
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	displayName = 'Test Node';
}`,
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	usableAsTool = true;
	displayName = 'Test Node';
}`,
		},
	],
});
