import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeOperationErrorItemIndexRule } from './node-operation-error-itemindex.js';

const ruleTester = new RuleTester();

const NODE_FILENAME = 'TestNode.node.ts';

function createNodeWithExecute(executeBody: string): { filename: string; code: string } {
	return {
		filename: NODE_FILENAME,
		code: `
import type { INodeType, INodeTypeDescription, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, NodeApiError } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		${executeBody}
	}
}`,
	};
}

ruleTester.run('node-operation-error-itemindex', NodeOperationErrorItemIndexRule, {
	valid: [
		{
			name: 'non-node class is ignored',
			filename: NODE_FILENAME,
			code: `
export class RegularClass {
	async execute() {
		const items = this.getInputData();
		for (let i = 0; i < items.length; i++) {
			throw new NodeOperationError(this.getNode(), 'error');
		}
	}
}`,
		},
		{
			name: 'NodeOperationError outside any loop is allowed',
			...createNodeWithExecute(`
				throw new NodeOperationError(this.getNode(), 'some error');
			`),
		},
		{
			name: 'NodeOperationError in a non-item loop is allowed',
			...createNodeWithExecute(`
				const settings = ['a', 'b', 'c'];
				for (let i = 0; i < settings.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error');
				}
			`),
		},
		{
			name: 'NodeOperationError with itemIndex in C-style for loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error', { itemIndex: i });
				}
			`),
		},
		{
			name: 'NodeOperationError with itemIndex shorthand in C-style for loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					throw new NodeOperationError(this.getNode(), 'error', { itemIndex });
				}
			`),
		},
		{
			name: 'NodeApiError with itemIndex in C-style for loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeApiError(this.getNode(), error, { itemIndex: i });
				}
			`),
		},
		{
			name: 'NodeOperationError with itemIndex in for...of loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (const [i, item] of items.entries()) {
					throw new NodeOperationError(this.getNode(), 'error', { itemIndex: i });
				}
			`),
		},
		{
			name: 'NodeOperationError with itemIndex in for...of directly over getInputData()',
			...createNodeWithExecute(`
				let i = 0;
				for (const item of this.getInputData()) {
					throw new NodeOperationError(this.getNode(), 'error', { itemIndex: i++ });
				}
			`),
		},
		{
			name: 'NodeOperationError with variable as 3rd arg (cannot statically verify — skip)',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					const opts = { itemIndex: i };
					throw new NodeOperationError(this.getNode(), 'error', opts);
				}
			`),
		},
		{
			name: 'NodeOperationError with spread plus explicit itemIndex in options',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error', { ...opts, itemIndex: i });
				}
			`),
		},
		{
			name: 'NodeOperationError outside execute() method is not flagged',
			filename: NODE_FILENAME,
			code: `
import type { INodeType, INodeTypeDescription, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['trigger'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: [],
		outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const items = this.getInputData();
		for (let i = 0; i < items.length; i++) {
			throw new NodeOperationError(this.getNode(), 'webhook error');
		}
		return { workflowData: [[]] };
	}
}`,
		},
		{
			name: 'NodeOperationError in nested non-item for loop inside item loop is allowed',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					const options = ['a', 'b'];
					for (let j = 0; j < options.length; j++) {
						throw new NodeOperationError(this.getNode(), 'error', { itemIndex: i });
					}
				}
			`),
		},
	],
	invalid: [
		{
			name: 'NodeOperationError without any options in C-style for loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error');
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
		{
			name: 'NodeOperationError with empty options object in C-style for loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error', {});
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
		{
			name: 'NodeOperationError with options but missing itemIndex in C-style for loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error', { description: 'something' });
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
		{
			name: 'NodeApiError without itemIndex in C-style for loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeApiError(this.getNode(), error);
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeApiError' } }],
		},
		{
			name: 'NodeOperationError without itemIndex in for...of over items variable',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (const item of items) {
					throw new NodeOperationError(this.getNode(), 'error');
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
		{
			name: 'NodeOperationError without itemIndex in for...of directly over getInputData()',
			...createNodeWithExecute(`
				for (const item of this.getInputData()) {
					throw new NodeOperationError(this.getNode(), 'error');
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
		{
			name: 'multiple errors in the same item loop',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					if (someCondition) {
						throw new NodeOperationError(this.getNode(), 'error A');
					}
					throw new NodeApiError(this.getNode(), error);
				}
			`),
			errors: [
				{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } },
				{ messageId: 'missingItemIndex', data: { errorClass: 'NodeApiError' } },
			],
		},
		{
			name: 'NodeOperationError without itemIndex when loop variable is named itemIndex',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					throw new NodeOperationError(this.getNode(), 'error', { description: 'oops' });
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
		{
			name: 'NodeOperationError with spread-only options (spread does not guarantee itemIndex)',
			...createNodeWithExecute(`
				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error', { ...opts });
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
		{
			name: 'NodeOperationError without itemIndex with non-standard items variable name',
			...createNodeWithExecute(`
				const inputItems = this.getInputData();
				for (let i = 0; i < inputItems.length; i++) {
					throw new NodeOperationError(this.getNode(), 'error');
				}
			`),
			errors: [{ messageId: 'missingItemIndex', data: { errorClass: 'NodeOperationError' } }],
		},
	],
});
