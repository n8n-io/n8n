import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const ruleId = '@n8n/community-nodes/no-webhooks-on-action-nodes';
const lifecycleRuleId = '@n8n/community-nodes/webhook-lifecycle-complete';
const relevantRules = new Set([
	ruleId,
	lifecycleRuleId,
	'@n8n/community-nodes/node-usable-as-tool',
]);
const message =
	'Webhook options are reserved for trigger nodes. Move this to a dedicated trigger node, or have the action node poll instead.';

const webhooks = `webhooks: [{
	name: 'default',
	httpMethod: 'POST',
	responseMode: 'onReceived',
	path: 'webhook',
}],`;

const webhookMethods = `webhookMethods = {
	default: {
		async checkExists() { return true; },
		async create() { return true; },
		async delete() { return true; },
	},
};`;

const webhookHandler = `async webhook() {
	return { workflowData: [this.helpers.returnJsonArray(this.getBodyData())] };
}`;

function createNodeCode({
	group = "['input']",
	description = '',
	members = '',
}: { group?: string; description?: string; members?: string } = {}): string {
	return `
export class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ${group},
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: false,
		properties: [],
		${description}
	};
	${members}
}`;
}

describe.each([
	['recommended', configs.recommended],
	['recommendedWithoutN8nCloudSupport', configs.recommendedWithoutN8nCloudSupport],
] as const)('%s webhook placement', (_name, config) => {
	const linter = new Linter();
	const lint = (code: string, filename = 'TestNode.node.ts') => {
		const messages = linter.verify(
			code,
			{
				files: ['**/*.ts'],
				plugins: config.plugins,
				// Use configured rules so the missing check fails on diagnostics, not rule loading.
				rules: Object.fromEntries(
					Object.entries(config.rules).filter(([id]) => relevantRules.has(id)),
				),
			},
			{ filename },
		);
		expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
		return messages;
	};

	// CE-3543: A complete lifecycle does not permit webhooks on an action node.
	it.each([
		{
			name: 'a webhooks array on an input-group action node',
			code: createNodeCode({ description: webhooks }),
		},
		{
			name: 'a webhooks array with a complete lifecycle and handler on an action node',
			code: createNodeCode({
				description: webhooks,
				members: `${webhookMethods}\n${webhookHandler}`,
			}),
		},
		{
			name: 'a webhookMethods property without a webhooks array',
			code: createNodeCode({ members: webhookMethods }),
		},
		{
			name: 'an async webhook method without webhookMethods or a webhooks array',
			code: createNodeCode({ members: webhookHandler }),
		},
		{
			name: 'webhookMethods and an async webhook method on an action node',
			code: createNodeCode({ members: `${webhookMethods}\n${webhookHandler}` }),
		},
		{
			name: 'the Wait-node resume pattern on an action node',
			code: createNodeCode({
				description: `webhooks: [{
					name: 'default',
					httpMethod: 'POST',
					responseMode: 'onReceived',
					restartWebhook: true,
					path: '',
				}],`,
				members: `${webhookMethods}
					${webhookHandler}
					async execute() {
						await this.helpers.httpRequest({
							method: 'POST',
							url: 'https://example.com/jobs',
							body: { callbackUrl: this.evaluateExpression('{{ $execution.resumeUrl }}', 0) },
						});
						await this.putExecutionToWait(new Date(Date.now() + 300000));
						return [this.getInputData()];
					}`,
			}),
		},
	])('reports $name as an error', ({ code }) => {
		const messages = lint(code).filter((diagnostic) => diagnostic.ruleId === ruleId);

		expect(messages).toEqual(
			expect.arrayContaining([expect.objectContaining({ ruleId, severity: 2, message })]),
		);
	});

	it.each([
		{
			name: 'an action node without webhook options',
			code: createNodeCode(),
			filename: 'TestNode.node.ts',
		},
		{
			name: 'a webhook trigger identified by its group',
			code: createNodeCode({
				group: "['input', 'trigger']",
				description: webhooks,
				members: `${webhookMethods}\n${webhookHandler}`,
			}),
			filename: 'TestNode.node.ts',
		},
		{
			name: 'a webhook trigger identified only by its filename',
			code: createNodeCode({
				description: webhooks,
				members: `${webhookMethods}\n${webhookHandler}`,
			}),
			filename: 'TestTrigger.node.ts',
		},
		{
			name: 'a polling trigger identified only by its poll method',
			code: createNodeCode({ members: 'async poll() { return null; }' }),
			filename: 'TestNode.node.ts',
		},
		{
			name: 'a trigger identified only by its trigger method',
			code: createNodeCode({
				description: webhooks,
				members: `${webhookMethods}\n${webhookHandler}\nasync trigger() { return {}; }`,
			}),
			filename: 'TestNode.node.ts',
		},
		{
			name: 'a helper class that is not a node',
			code: `export class Helper { ${webhookMethods}\n${webhookHandler} }`,
			filename: 'TestNode.node.ts',
		},
		{
			name: 'a file without the node filename suffix',
			code: createNodeCode({
				description: webhooks,
				members: `${webhookMethods}\n${webhookHandler}`,
			}),
			filename: 'TestNode.ts',
		},
	])('accepts $name', ({ code, filename }) => {
		expect(lint(code, filename)).toEqual([]);
	});

	it('checks the lifecycle of webhook triggers', () => {
		const code = createNodeCode({ group: "['trigger']", description: webhooks });

		expect(lint(code)).toEqual([
			expect.objectContaining({
				ruleId: lifecycleRuleId,
				messageId: 'missingWebhookMethods',
				severity: 2,
			}),
		]);
	});
});
