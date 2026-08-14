import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoSilentErrorSwallowingRule } from './no-silent-error-swallowing.js';

const ruleTester = new RuleTester();

function createTriggerNode(webhookMethods: string): string {
	return `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger',
		name: 'testTrigger',
		group: ['trigger'],
		version: 1,
		description: 'A test trigger',
		defaults: { name: 'Test Trigger' },
		inputs: [],
		outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};

	webhookMethods = ${webhookMethods};
}`;
}

ruleTester.run('no-silent-error-swallowing', NoSilentErrorSwallowingRule, {
	valid: [
		{
			name: 'lifecycle methods with no catch blocks',
			code: createTriggerNode(`{
				default: {
					async checkExists(this: IHookFunctions): Promise<boolean> { return true; },
					async create(this: IHookFunctions): Promise<boolean> { return true; },
					async delete(this: IHookFunctions): Promise<boolean> { return true; },
				},
			}`),
		},
		{
			name: 'catch block that logs and returns',
			code: createTriggerNode(`{
				default: {
					async checkExists(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							this.logger.error('checkExists failed', { error });
							return false;
						}
					},
				},
			}`),
		},
		{
			name: 'catch block that rethrows',
			code: createTriggerNode(`{
				default: {
					async create(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							throw error;
						}
					},
				},
			}`),
		},
		{
			name: 'catch block that returns a non-boolean expression',
			code: createTriggerNode(`{
				default: {
					async delete(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							return this.recover(error);
						}
					},
				},
			}`),
		},
		{
			name: 'silent catch inside a non-lifecycle method is ignored',
			code: createTriggerNode(`{
				default: {
					async someHelper(this: IHookFunctions): Promise<boolean> {
						try {
							return true;
						} catch (error) {
							return false;
						}
					},
				},
			}`),
		},
		{
			name: 'silent catch inside a nested callback within a lifecycle method is ignored',
			code: createTriggerNode(`{
				default: {
					async create(this: IHookFunctions): Promise<boolean> {
						const results = items.map((item) => {
							try {
								return normalize(item);
							} catch (error) {
								return false;
							}
						});
						return results.length > 0;
					},
				},
			}`),
		},
		{
			name: 'silent catch in a non-node-type class is ignored',
			code: `
export class RegularClass {
	webhookMethods = {
		default: {
			async checkExists() {
				try {
					return true;
				} catch (error) {
					return false;
				}
			},
		},
	};
}`,
		},
	],
	invalid: [
		{
			name: 'empty catch block in checkExists',
			code: createTriggerNode(`{
				default: {
					async checkExists(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {}
					},
				},
			}`),
			errors: [{ messageId: 'emptyCatch', data: { method: 'checkExists' } }],
		},
		{
			name: 'catch block that only returns false in create',
			code: createTriggerNode(`{
				default: {
					async create(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							return false;
						}
					},
				},
			}`),
			errors: [{ messageId: 'silentReturn', data: { method: 'create' } }],
		},
		{
			name: 'catch block that only returns true in delete',
			code: createTriggerNode(`{
				default: {
					async delete(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							return true;
						}
					},
				},
			}`),
			errors: [{ messageId: 'silentReturn', data: { method: 'delete' } }],
		},
		{
			name: 'catch block with a bare return',
			code: createTriggerNode(`{
				default: {
					async checkExists(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							return;
						}
					},
				},
			}`),
			errors: [{ messageId: 'silentReturn', data: { method: 'checkExists' } }],
		},
		{
			name: 'silent catch defined via arrow function method',
			code: createTriggerNode(`{
				default: {
					checkExists: async (this: IHookFunctions): Promise<boolean> => {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							return false;
						}
					},
				},
			}`),
			errors: [{ messageId: 'silentReturn', data: { method: 'checkExists' } }],
		},
		{
			name: 'flagged regardless of file name (webhookMethods is the signal)',
			filename: 'GenericFunctions.ts',
			code: createTriggerNode(`{
				default: {
					async create(this: IHookFunctions): Promise<boolean> {
						try {
							return await this.helpers.httpRequest({ url: 'https://example.com' });
						} catch (error) {
							return false;
						}
					},
				},
			}`),
			errors: [{ messageId: 'silentReturn', data: { method: 'create' } }],
		},
		{
			name: 'multiple silent lifecycle methods each flagged',
			code: createTriggerNode(`{
				default: {
					async checkExists(this: IHookFunctions): Promise<boolean> {
						try { return await this.helpers.httpRequest({ url: 'https://example.com' }); } catch (error) {}
					},
					async create(this: IHookFunctions): Promise<boolean> {
						try { return await this.helpers.httpRequest({ url: 'https://example.com' }); } catch (error) { return false; }
					},
					async delete(this: IHookFunctions): Promise<boolean> {
						try { return await this.helpers.httpRequest({ url: 'https://example.com' }); } catch (error) { return true; }
					},
				},
			}`),
			errors: [
				{ messageId: 'emptyCatch', data: { method: 'checkExists' } },
				{ messageId: 'silentReturn', data: { method: 'create' } },
				{ messageId: 'silentReturn', data: { method: 'delete' } },
			],
		},
	],
});
