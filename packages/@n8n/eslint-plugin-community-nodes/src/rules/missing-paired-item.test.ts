import { RuleTester } from '@typescript-eslint/rule-tester';

import { MissingPairedItemRule } from './missing-paired-item.js';

const ruleTester = new RuleTester();

ruleTester.run('missing-paired-item', MissingPairedItemRule, {
	valid: [
		{
			name: 'object with json and pairedItem in execute()',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		return [[{ json: { id: 1 }, pairedItem: { item: 0 } }]];
	}
}`,
		},
		{
			name: 'object with json and pairedItem as number shorthand',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		return [[{ json: { id: 1 }, pairedItem: 0 }]];
	}
}`,
		},
		{
			name: 'non-node-type class is ignored',
			filename: 'MyNode.node.ts',
			code: `
class Helper {
	async execute() {
		return [[{ json: { id: 1 } }]];
	}
}`,
		},
		{
			name: 'non-.node.ts file is ignored',
			filename: 'utils.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		return [[{ json: { id: 1 } }]];
	}
}`,
		},
		{
			name: 'object outside execute() is ignored',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async someHelper() {
		return { json: { id: 1 } };
	}
}`,
		},
		{
			name: 'object without json property is ignored',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		const options = { url: 'https://api.example.com', method: 'GET' };
		return [[{ json: options, pairedItem: { item: 0 } }]];
	}
}`,
		},
		{
			name: 'object with unrecognized keys is not INodeExecutionData',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		const config = { json: true, indent: 2, spaces: 4 };
		return this.process(config);
	}
}`,
		},
		{
			name: 'class extending Node base class with pairedItem',
			filename: 'MyNode.node.ts',
			code: `
class MyNode extends Node {
	description = {};
	async execute() {
		return [[{ json: { id: 1 }, pairedItem: { item: 0 } }]];
	}
}`,
		},
		{
			name: 'spread element in object is allowed',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		return [[{ ...baseItem, json: { id: 1 } }]];
	}
}`,
		},
		{
			name: 'object inside constructExecutionMetaData is allowed',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		const executionData = this.helpers.constructExecutionMetaData(
			[{ json: { success: true } }],
			{ itemData: { item: i } },
		);
		return [executionData];
	}
}`,
		},
		{
			name: 'object with computed property key is not INodeExecutionData',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		const obj = { json: data, [dynamicKey]: value };
		return [[obj]];
	}
}`,
		},
	],
	invalid: [
		{
			name: 'missing pairedItem in return statement',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		return [[{ json: { id: 1 } }]];
	}
}`,
			errors: [{ messageId: 'missingPairedItem' }],
		},
		{
			name: 'missing pairedItem in .map() callback',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		const items = this.getInputData();
		return [items.map((item, index) => ({ json: item.json }))];
	}
}`,
			errors: [{ messageId: 'missingPairedItem' }],
		},
		{
			name: 'missing pairedItem in .push() call',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		const returnData = [];
		returnData.push({ json: { result: true } });
		return [returnData];
	}
}`,
			errors: [{ messageId: 'missingPairedItem' }],
		},
		{
			name: 'multiple objects missing pairedItem',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		const returnData = [];
		returnData.push({ json: { a: 1 } });
		returnData.push({ json: { b: 2 } });
		return [returnData];
	}
}`,
			errors: [{ messageId: 'missingPairedItem' }, { messageId: 'missingPairedItem' }],
		},
		{
			name: 'object with json and binary but no pairedItem',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		return [[{ json: { id: 1 }, binary: { data: binaryData } }]];
	}
}`,
			errors: [{ messageId: 'missingPairedItem' }],
		},
		{
			name: 'object with json and executionStatus but no pairedItem',
			filename: 'MyNode.node.ts',
			code: `
class MyNode implements INodeType {
	description = {};
	async execute() {
		return [[{ json: { id: 1 }, executionStatus: 'success' }]];
	}
}`,
			errors: [{ messageId: 'missingPairedItem' }],
		},
		{
			name: 'class extending Node base class missing pairedItem',
			filename: 'MyNode.node.ts',
			code: `
class MyNode extends Node {
	description = {};
	async execute() {
		return [[{ json: { id: 1 } }]];
	}
}`,
			errors: [{ messageId: 'missingPairedItem' }],
		},
	],
});
