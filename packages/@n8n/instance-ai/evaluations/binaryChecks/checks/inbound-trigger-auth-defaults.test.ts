import { inboundTriggerAuthDefaults } from './inbound-trigger-auth-defaults';
import type { WorkflowNodeResponse, WorkflowResponse } from '../../clients/n8n-client';

function workflowWith(nodes: WorkflowNodeResponse[]): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Landing page',
		active: false,
		versionId: 'test-version',
		nodes,
		connections: {},
	};
}

function pageNode(authentication: string): WorkflowNodeResponse {
	return {
		name: 'Landing Page',
		type: 'n8n-nodes-base.webpage',
		parameters: { path: 'my-page', authentication },
	};
}

function webhookNode(authentication: string): WorkflowNodeResponse {
	return {
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		parameters: { path: 'orders', authentication },
	};
}

function pageWorkflow(authentication: string): WorkflowResponse {
	return workflowWith([pageNode(authentication)]);
}

describe('inboundTriggerAuthDefaults', () => {
	it('passes a public webpage', async () => {
		const result = await inboundTriggerAuthDefaults.run(pageWorkflow('none'), {
			prompt: 'Build me a landing page for Acme Notes served at /my-page',
		});

		expect(result).toEqual({ pass: true });
	});

	it('fails when a webpage turns on auth that the prompt did not ask for', async () => {
		const result = await inboundTriggerAuthDefaults.run(pageWorkflow('n8nOAuth2'), {
			prompt: 'Build me a landing page for Acme Notes served at /my-page',
		});

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('"Landing Page" sets authentication to "n8nOAuth2"');
	});

	it.each([
		'Build a team page at /team that only signed-in n8n users can open',
		'Build a status site for logged-in users only',
		'Build an internal docs page that requires login',
		'Build a page at /roadmap and protect it so outsiders cannot see it',
	])('passes protected-page auth when the prompt asks for it: %s', async (prompt) => {
		const result = await inboundTriggerAuthDefaults.run(pageWorkflow('n8nOAuth2'), { prompt });

		expect(result.pass).toBe(true);
	});

	it.each([
		'Create a webhook that receives contact details from my website and adds them to HubSpot with my private app token.',
		'When a webhook receives a new order, create a Notion page for it. Each order requires a page in our Orders database.',
		'Build a webhook that receives events for logged-in users from our app and stores each one in a data table.',
		'Create a webhook for new sign-ups. Each new user requires login approval in Slack.',
	])('fails unrequested webhook auth when only page phrases match: %s', async (prompt) => {
		const result = await inboundTriggerAuthDefaults.run(workflowWith([webhookNode('headerAuth')]), {
			prompt,
		});

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('"Webhook" sets authentication to "headerAuth"');
	});

	it('applies page phrases only to the webpage when a webhook is in the same workflow', async () => {
		const result = await inboundTriggerAuthDefaults.run(
			workflowWith([pageNode('n8nOAuth2'), webhookNode('headerAuth')]),
			{ prompt: 'Build a dashboard page that only signed-in n8n users can open, with live data' },
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toBe('"Webhook" sets authentication to "headerAuth"');
	});

	it('passes webhook auth when the prompt asks for an authenticated webhook', async () => {
		const result = await inboundTriggerAuthDefaults.run(
			workflowWith([pageNode('none'), webhookNode('headerAuth')]),
			{ prompt: 'Build a landing page and a webhook protected with header auth' },
		);

		expect(result).toEqual({ pass: true });
	});
});
