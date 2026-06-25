import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireContinueOnFailRule } from './require-continue-on-fail.js';

const ruleTester = new RuleTester();

function createNodeWithExecute(executeBody: string): string {
	return `
import type { INodeType, INodeTypeDescription, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

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
}`;
}

ruleTester.run('require-continue-on-fail', RequireContinueOnFailRule, {
	valid: [
		{
			name: 'node with continueOnFail in catch block',
			code: createNodeWithExecute(`
				const items = this.getInputData();
				const returnData: INodeExecutionData[] = [];
				for (let i = 0; i < items.length; i++) {
					try {
						returnData.push({ json: { result: true } });
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: error.message } });
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			`),
		},
		{
			name: 'non-node class with execute method (should be ignored)',
			code: `
export class RegularClass {
	async execute() {
		return [[]];
	}
}`,
		},
		{
			name: 'node class without execute method (should be ignored)',
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

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
}`,
		},
		{
			name: 'node extending Node base class with continueOnFail',
			code: `
import { Node } from 'n8n-workflow';

export class TestNode extends Node {
	async execute() {
		try {
			// do work
		} catch (error) {
			if (this.continueOnFail()) {
				return [[]];
			}
			throw error;
		}
		return [[]];
	}
}`,
		},
	],
	invalid: [
		{
			name: 'node with execute but no continueOnFail',
			code: createNodeWithExecute(`
				const items = this.getInputData();
				const returnData: INodeExecutionData[] = [];
				for (let i = 0; i < items.length; i++) {
					returnData.push({ json: { result: true } });
				}
				return [returnData];
			`),
			errors: [{ messageId: 'missingContinueOnFail' }],
		},
		{
			name: 'node with try/catch but no continueOnFail check',
			code: createNodeWithExecute(`
				const items = this.getInputData();
				const returnData: INodeExecutionData[] = [];
				for (let i = 0; i < items.length; i++) {
					try {
						returnData.push({ json: { result: true } });
					} catch (error) {
						throw error;
					}
				}
				return [returnData];
			`),
			errors: [{ messageId: 'missingContinueOnFail' }],
		},
	],
});
