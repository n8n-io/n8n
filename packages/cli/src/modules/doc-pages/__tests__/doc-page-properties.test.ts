import type { AgentIntegrationConfig, StoredAgentConfig } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

import { agentProperties, workflowProperties } from '../doc-page-properties';

const urls = {
	webhook: 'https://n8n.example.com/webhook',
	form: 'https://n8n.example.com/form',
	publicChat: true,
};

const node = (type: string, parameters: INode['parameters'] = {}, extra: Partial<INode> = {}) =>
	({
		id: type,
		name: type.split('.').pop() ?? type,
		type,
		typeVersion: 2,
		position: [0, 0],
		parameters,
		...extra,
	}) as INode;

const triggersOf = (...nodes: INode[]) => workflowProperties('wf1', nodes, urls).triggers;

describe('workflowProperties', () => {
	it('reads a webhook trigger', () => {
		const [trigger] = triggersOf(
			node(
				'n8n-nodes-base.webhook',
				{ httpMethod: 'POST', path: 'absence', authentication: 'headerAuth' },
				{ webhookId: 'hook1', credentials: { httpHeaderAuth: { id: 'c1', name: 'Secret' } } },
			),
		);

		expect(trigger).toEqual({
			nodeName: 'webhook',
			nodeType: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			type: 'webhook',
			methods: ['POST'],
			url: 'https://n8n.example.com/webhook/absence',
			auth: 'headerAuth',
		});
		expect(JSON.stringify(trigger)).not.toContain('Secret');
	});

	it('uses the webhook defaults and maps unknown auth to none', () => {
		const [single, multiple, listed] = triggersOf(
			node('n8n-nodes-base.webhook', { authentication: 'n8nOAuth2' }, { webhookId: 'hook1' }),
			node('n8n-nodes-base.webhook', { multipleMethods: true }, { webhookId: 'hook2' }),
			node(
				'n8n-nodes-base.webhook',
				{ multipleMethods: true, httpMethod: ['PUT', 'DELETE'], authentication: 'jwtAuth' },
				{ webhookId: 'hook3' },
			),
		);

		expect(single).toMatchObject({
			methods: ['GET'],
			url: 'https://n8n.example.com/webhook/hook1',
			auth: 'none',
		});
		expect(multiple).toMatchObject({ methods: ['GET', 'POST'], auth: 'none' });
		expect(listed).toMatchObject({ methods: ['PUT', 'DELETE'], auth: 'jwtAuth' });
	});

	it('reads a form trigger', () => {
		const [v2, v1] = triggersOf(
			node(
				'n8n-nodes-base.formTrigger',
				{ authentication: 'basicAuth', options: { path: 'signup' } },
				{ webhookId: 'form1' },
			),
			node('n8n-nodes-base.formTrigger', { path: 'old' }, { webhookId: 'form2', typeVersion: 1 }),
		);

		expect(v2).toMatchObject({
			type: 'form',
			url: 'https://n8n.example.com/form/signup',
			auth: 'basicAuth',
		});
		expect(v1).toMatchObject({
			type: 'form',
			url: 'https://n8n.example.com/webhook/old/n8n-form',
			auth: 'none',
		});
	});

	it('sets the chat URL only when the chat is public', () => {
		const chat = (isPublic: boolean) =>
			node('@n8n/n8n-nodes-langchain.chatTrigger', { public: isPublic }, { webhookId: 'chat1' });

		expect(triggersOf(chat(true))[0]).toMatchObject({
			type: 'chat',
			url: 'https://n8n.example.com/webhook/chat1/chat',
		});
		expect(triggersOf(chat(false))[0]).toMatchObject({ type: 'chat', url: null });
		expect(
			workflowProperties('wf1', [chat(true)], { ...urls, publicChat: false }).triggers[0],
		).toMatchObject({ url: null });
	});

	it('uses the schedule defaults when the rule is not stored', () => {
		expect(triggersOf(node('n8n-nodes-base.scheduleTrigger'))[0]).toMatchObject({
			type: 'schedule',
			rules: [{ every: 'days', interval: 1, hour: 0, minute: 0 }],
		});
	});

	it('reads every schedule rule type', () => {
		const [trigger] = triggersOf(
			node('n8n-nodes-base.scheduleTrigger', {
				rule: {
					interval: [
						{ field: 'seconds' },
						{ field: 'minutes', minutesInterval: 15 },
						{ field: 'hours', triggerAtMinute: 30 },
						{ field: 'weeks', triggerAtDay: [1, 5], triggerAtHour: 9 },
						{ field: 'months', monthsInterval: 2, triggerAtDayOfMonth: 15 },
						{ field: 'cronExpression', expression: '0 9 * * 1-5' },
					],
				},
			}),
		);

		expect(trigger).toMatchObject({
			rules: [
				{ every: 'seconds', interval: 30 },
				{ every: 'minutes', interval: 15 },
				{ every: 'hours', interval: 1, minute: 30 },
				{ every: 'weeks', interval: 1, hour: 9, minute: 0, weekdays: [1, 5] },
				{ every: 'months', interval: 2, hour: 0, minute: 0, dayOfMonth: 15 },
				{ cron: '0 9 * * 1-5' },
			],
		});
	});

	it('reads the legacy interval and cron nodes', () => {
		const [interval, cron] = triggersOf(
			node('n8n-nodes-base.interval', { interval: 10, unit: 'minutes' }),
			node('n8n-nodes-base.cron', { triggerTimes: { item: [{ mode: 'everyHour' }] } }),
		);

		expect(interval).toMatchObject({ rules: [{ every: 'minutes', interval: 10 }] });
		expect(cron).toMatchObject({ type: 'schedule', rules: [] });
	});

	it('marks other triggers as events and skips disabled and manual nodes', () => {
		const triggers = triggersOf(
			node('n8n-nodes-base.githubTrigger', { owner: 'n8n-io' }),
			node('n8n-nodes-base.webhook', {}, { disabled: true }),
			node('n8n-nodes-base.manualTrigger'),
			node('n8n-nodes-base.set'),
		);

		expect(triggers).toEqual([
			{
				nodeName: 'githubTrigger',
				nodeType: 'n8n-nodes-base.githubTrigger',
				typeVersion: 2,
				type: 'event',
			},
		]);
	});
});

describe('agentProperties', () => {
	it('reads the model and the unique channel types', () => {
		const integrations = [
			{ type: 'slack', credentialId: 'c1' },
			{ type: 'slack', credentialId: 'c2' },
			{ type: 'telegram', credentialId: '' },
			{ type: 'n8n_chat', credentialId: '' },
		] as AgentIntegrationConfig[];

		const properties = agentProperties({
			activeVersion: { schema: { model: 'anthropic/claude-sonnet-4-5' } as StoredAgentConfig },
			integrations,
		});

		expect(properties).toEqual({
			triggers: [],
			agent: { model: 'anthropic/claude-sonnet-4-5', channels: ['slack', 'n8n_chat'] },
		});
		expect(JSON.stringify(properties)).not.toContain('c1');
	});

	it('has no model when the published config has none', () => {
		expect(
			agentProperties({
				activeVersion: { schema: { model: '' } as StoredAgentConfig },
				integrations: [],
			}).agent,
		).toEqual({ model: null, channels: [] });
	});
});
