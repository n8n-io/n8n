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
		{
			name: 'method reassigned after its declaration is not fixed',
			code: `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

async function removeWebhook(this: IHookFunctions): Promise<boolean> {
	try {
		return await this.helpers.httpRequest({ url: 'https://example.com' });
	} catch (error) {}
}

removeWebhook = safeRemoveWebhook;

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = { default: { delete: removeWebhook } };
}`,
		},
		{
			name: 'method imported from another file is out of reach',
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { removeWebhook } from './GenericFunctions';

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = { default: { delete: removeWebhook } };
}`,
		},
	],
	invalid: [
		{
			name: 'silent catch in a method declared above the class and passed by name',
			code: `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

async function removeWebhook(this: IHookFunctions): Promise<boolean> {
	try {
		return await this.helpers.httpRequest({ url: 'https://example.com' });
	} catch (error) {}
}

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = { default: { delete: removeWebhook } };
}`,
			errors: [{ messageId: 'emptyCatch', data: { method: 'delete' } }],
		},
		{
			name: 'silent catch in a const arrow function passed by name',
			code: `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

const checkExists = async function (this: IHookFunctions): Promise<boolean> {
	try {
		return await this.helpers.httpRequest({ url: 'https://example.com' });
	} catch (error) {
		return false;
	}
};

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = { default: { checkExists } };
}`,
			errors: [{ messageId: 'silentReturn', data: { method: 'checkExists' } }],
		},
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
