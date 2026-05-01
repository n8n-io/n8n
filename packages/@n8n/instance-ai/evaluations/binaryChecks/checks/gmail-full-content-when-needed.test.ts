import { gmailFullContentWhenNeeded } from './gmail-full-content-when-needed';
import type { WorkflowResponse } from '../../clients/n8n-client';

const GMAIL_TRIGGER_TYPE = 'n8n-nodes-base.gmailTrigger';
const GMAIL_TYPE = 'n8n-nodes-base.gmail';
const SLACK_TYPE = 'n8n-nodes-base.slack';
const SET_TYPE = 'n8n-nodes-base.set';
const AGENT_TYPE = '@n8n/n8n-nodes-langchain.agent';

interface GmailNodeFixture {
	type: typeof GMAIL_TYPE | typeof GMAIL_TRIGGER_TYPE;
	typeVersion: number;
	parameters: Record<string, unknown>;
}

function buildWorkflow(
	gmail: GmailNodeFixture,
	downstream: Array<{ name: string; type: string; parameters: Record<string, unknown> }>,
	connections: WorkflowResponse['connections'],
): WorkflowResponse {
	return {
		id: 'wf-gmail-content',
		name: 'Gmail content check',
		active: false,
		nodes: [
			{
				name: 'Gmail',
				type: gmail.type,
				typeVersion: gmail.typeVersion,
				parameters: gmail.parameters,
			},
			...downstream,
		],
		connections,
	};
}

const GMAIL_TO_SLACK_MAIN: WorkflowResponse['connections'] = {
	Gmail: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] },
};

const GMAIL_TO_SET_TO_SLACK_MAIN: WorkflowResponse['connections'] = {
	Gmail: { main: [[{ node: 'Reshape', type: 'main', index: 0 }]] },
	Reshape: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] },
};

const GMAIL_AS_AI_TOOL: WorkflowResponse['connections'] = {
	Gmail: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
};

describe('gmailFullContentWhenNeeded', () => {
	it('fails when a direct successor reads $json.text from Gmail v2 with simple omitted', async () => {
		const workflow = buildWorkflow(
			{ type: GMAIL_TYPE, typeVersion: 2.1, parameters: { resource: 'message', operation: 'get' } },
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Gmail');
	});

	it('fails when Gmail v2 has simple:true and a successor reads $json.html', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 2.1,
				parameters: { resource: 'message', operation: 'get', simple: true },
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.html }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
	});

	it('passes when Gmail v2 has simple:false and a successor reads $json.text', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 2.1,
				parameters: { resource: 'message', operation: 'get', simple: false },
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it("fails when a transitive successor reads $('Gmail').item.json.html with simplified output", async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 2.1,
				parameters: { resource: 'message', operation: 'get', simple: true },
			},
			[
				{
					name: 'Reshape',
					type: SET_TYPE,
					parameters: {
						assignments: { assignments: [{ name: 'noop', value: '=ok' }] },
					},
				},
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: "={{ $('Gmail').item.json.html }}" },
				},
			],
			GMAIL_TO_SET_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
	});

	it('fails when Gmail is connected as ai_tool with simplified output enabled', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 2.1,
				parameters: { resource: 'message', operation: 'getAll', simple: true },
			},
			[
				{
					name: 'AI Agent',
					type: AGENT_TYPE,
					parameters: {},
				},
			],
			GMAIL_AS_AI_TOOL,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
	});

	it("fails for Gmail v1 with format:'metadata' plus body/content usage", async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 1,
				parameters: {
					resource: 'message',
					operation: 'get',
					additionalFields: { format: 'metadata' },
				},
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
	});

	it("passes for Gmail v1 with format:'full' plus body/content usage", async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 1,
				parameters: {
					resource: 'message',
					operation: 'get',
					additionalFields: { format: 'full' },
				},
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it('does not flag workflows that only read subject, from, labels, or IDs', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 2.1,
				parameters: { resource: 'message', operation: 'get', simple: true },
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.subject }} from {{ $json.from }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it('does not flag when Gmail v1 format is itself an expression (unknown value)', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 1,
				parameters: {
					resource: 'message',
					operation: 'get',
					additionalFields: { format: '={{ $json.preferredFormat }}' },
				},
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it('does not flag when the simple parameter is itself an expression (unknown value)', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 2.1,
				parameters: {
					resource: 'message',
					operation: 'get',
					simple: '={{ $json.useSimple }}',
				},
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it('fails for Gmail Trigger with simple omitted when a successor reads $json.html', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TRIGGER_TYPE,
				typeVersion: 1.4,
				parameters: { event: 'messageReceived' },
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.html }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
	});

	it('passes for Gmail Trigger with simple:false even when a successor reads $json.text', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TRIGGER_TYPE,
				typeVersion: 1.4,
				parameters: { event: 'messageReceived', simple: false },
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it('does not flag Gmail v2.3+ with simple omitted (new default is false)', async () => {
		const workflow = buildWorkflow(
			{ type: GMAIL_TYPE, typeVersion: 2.3, parameters: { resource: 'message', operation: 'get' } },
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it('still fails Gmail v2.3+ when simple is explicitly set to true', async () => {
		const workflow = buildWorkflow(
			{
				type: GMAIL_TYPE,
				typeVersion: 2.3,
				parameters: { resource: 'message', operation: 'get', simple: true },
			},
			[
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			GMAIL_TO_SLACK_MAIN,
		);

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
	});

	it('passes when there are no Gmail nodes in the workflow', async () => {
		const workflow: WorkflowResponse = {
			id: 'wf-no-gmail',
			name: 'No Gmail',
			active: false,
			nodes: [
				{
					name: 'Slack',
					type: SLACK_TYPE,
					parameters: { text: '={{ $json.text }}' },
				},
			],
			connections: {},
		};

		const result = await gmailFullContentWhenNeeded.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});
});
