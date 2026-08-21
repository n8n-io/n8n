import { RuleTester } from '@typescript-eslint/rule-tester';

import { WebhookLifecycleCompleteRule } from './webhook-lifecycle-complete.js';

const ruleTester = new RuleTester();

function createTriggerNode(options: {
	group?: string;
	hasWebhooks?: boolean;
	webhookMethods?: string | null;
}): string {
	const { group = 'trigger', hasWebhooks = true, webhookMethods } = options;
	const webhooksProp = hasWebhooks
		? "webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],"
		: '';
	const methodsProp = webhookMethods === null ? '' : `\n\twebhookMethods = ${webhookMethods};`;

	return `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger',
		name: 'testTrigger',
		group: ['${group}'],
		version: 1,
		description: 'A test trigger',
		defaults: { name: 'Test Trigger' },
		inputs: [],
		outputs: ['main'],
		${webhooksProp}
		properties: [],
	};${methodsProp}
}`;
}

const completeWebhookMethods = `{
	default: {
		async checkExists(this: IHookFunctions): Promise<boolean> { return true; },
		async create(this: IHookFunctions): Promise<boolean> { return true; },
		async delete(this: IHookFunctions): Promise<boolean> { return true; },
	},
}`;

ruleTester.run('webhook-lifecycle-complete', WebhookLifecycleCompleteRule, {
	valid: [
		{
			name: 'trigger node with all three webhook lifecycle methods',
			code: createTriggerNode({ webhookMethods: completeWebhookMethods }),
		},
		{
			name: 'non-trigger node without webhookMethods',
			code: createTriggerNode({
				group: 'transform',
				hasWebhooks: false,
				webhookMethods: null,
			}),
		},
		{
			name: 'polling trigger without webhooks array and without webhookMethods',
			code: createTriggerNode({ hasWebhooks: false, webhookMethods: null }),
		},
		{
			name: 'non-INodeType class with webhookMethods (should be ignored)',
			code: `
export class RegularClass {
	webhookMethods = {
		default: {
			async checkExists() { return true; },
		},
	};
}`,
		},
		{
			name: 'trigger with multiple webhook groups, all complete',
			code: createTriggerNode({
				webhookMethods: `{
					default: {
						async checkExists() { return true; },
						async create() { return true; },
						async delete() { return true; },
					},
					setup: {
						async checkExists() { return true; },
						async create() { return true; },
						async delete() { return true; },
					},
				}`,
			}),
		},
		{
			name: 'webhook lifecycle defined via arrow functions',
			code: createTriggerNode({
				webhookMethods: `{
					default: {
						checkExists: async () => true,
						create: async () => true,
						delete: async () => true,
					},
				}`,
			}),
		},
		{
			name: 'webhookMethods referred to by name, complete',
			code: `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

const WEBHOOK_METHODS = ${completeWebhookMethods};

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = WEBHOOK_METHODS;
}`,
		},
		{
			name: 'webhookMethods imported from another file is out of reach',
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { WEBHOOK_METHODS } from './GenericFunctions';

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = WEBHOOK_METHODS;
}`,
		},
		{
			name: 'lifecycle group completed by member assignment is not fixed',
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

const WEBHOOK_METHODS = { default: {} };
WEBHOOK_METHODS.default.checkExists = async () => true;
WEBHOOK_METHODS.default.create = async () => true;
WEBHOOK_METHODS.default.delete = async () => true;

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = WEBHOOK_METHODS;
}`,
		},
		{
			name: 'lifecycle group handed to a call is not fixed',
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

const WEBHOOK_METHODS = { default: {} };
Object.assign(WEBHOOK_METHODS.default, sharedLifecycle);

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = WEBHOOK_METHODS;
}`,
		},
		{
			name: 'webhookMethods held in a let is not fixed',
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

let webhookMethodsValue = { default: {} };

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = webhookMethodsValue;
}`,
		},
	],
	invalid: [
		{
			name: 'description referred to by name, delete missing',
			code: `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

const DESCRIPTION = {
	displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
	description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
	webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
	properties: [],
};

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = DESCRIPTION;

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> { return true; },
			async create(this: IHookFunctions): Promise<boolean> { return true; },
		},
	};
}`,
			errors: [
				{
					messageId: 'missingLifecycleMethod',
					data: { group: 'default', missing: '`delete`' },
				},
			],
		},
		{
			name: 'lifecycle group referred to by name, delete missing',
			code: `
import type { INodeType, INodeTypeDescription, IHookFunctions } from 'n8n-workflow';

const defaultGroup = {
	async checkExists(this: IHookFunctions): Promise<boolean> { return true; },
	async create(this: IHookFunctions): Promise<boolean> { return true; },
};

export class TestTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Trigger', name: 'testTrigger', group: ['trigger'], version: 1,
		description: 'A test trigger', defaults: { name: 'Test Trigger' }, inputs: [], outputs: ['main'],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [],
	};
	webhookMethods = { default: defaultGroup };
}`,
			errors: [
				{
					messageId: 'missingLifecycleMethod',
					data: { group: 'default', missing: '`delete`' },
				},
			],
		},
		{
			name: 'trigger node missing webhookMethods entirely',
			code: createTriggerNode({ webhookMethods: null }),
			errors: [{ messageId: 'missingWebhookMethods' }],
		},
		{
			name: 'trigger node with empty webhookMethods object (no lifecycle groups)',
			code: createTriggerNode({ webhookMethods: '{}' }),
			errors: [{ messageId: 'emptyWebhookMethods' }],
		},
		{
			name: 'trigger node with empty webhookMethods group (all three missing)',
			code: createTriggerNode({
				webhookMethods: `{
					default: {},
				}`,
			}),
			errors: [
				{
					messageId: 'missingLifecycleMethod',
					data: {
						group: 'default',
						missing: '`checkExists`, `create`, `delete`',
					},
				},
			],
		},
		{
			name: 'trigger node missing only delete',
			code: createTriggerNode({
				webhookMethods: `{
					default: {
						async checkExists() { return true; },
						async create() { return true; },
					},
				}`,
			}),
			errors: [
				{
					messageId: 'missingLifecycleMethod',
					data: { group: 'default', missing: '`delete`' },
				},
			],
		},
		{
			name: 'trigger node missing checkExists and create',
			code: createTriggerNode({
				webhookMethods: `{
					default: {
						async delete() { return true; },
					},
				}`,
			}),
			errors: [
				{
					messageId: 'missingLifecycleMethod',
					data: { group: 'default', missing: '`checkExists`, `create`' },
				},
			],
		},
		{
			name: 'non-trigger node with incomplete webhookMethods (still flagged)',
			code: createTriggerNode({
				group: 'transform',
				hasWebhooks: false,
				webhookMethods: `{
					default: {
						async create() { return true; },
					},
				}`,
			}),
			errors: [
				{
					messageId: 'missingLifecycleMethod',
					data: { group: 'default', missing: '`checkExists`, `delete`' },
				},
			],
		},
		{
			name: 'webhook trigger (detected via webhooks array) missing webhookMethods',
			code: createTriggerNode({
				group: 'transform',
				hasWebhooks: true,
				webhookMethods: null,
			}),
			errors: [{ messageId: 'missingWebhookMethods' }],
		},
		{
			name: 'multiple webhook groups each missing methods',
			code: createTriggerNode({
				webhookMethods: `{
					default: {
						async checkExists() { return true; },
					},
					setup: {
						async create() { return true; },
						async delete() { return true; },
					},
				}`,
			}),
			errors: [
				{
					messageId: 'missingLifecycleMethod',
					data: { group: 'default', missing: '`create`, `delete`' },
				},
				{
					messageId: 'missingLifecycleMethod',
					data: { group: 'setup', missing: '`checkExists`' },
				},
			],
		},
	],
});
