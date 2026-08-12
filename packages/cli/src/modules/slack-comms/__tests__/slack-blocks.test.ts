import type { InstanceAiConfirmationRequestPayload } from '@n8n/api-types';

import {
	confirmationBlocks,
	errorBlocks,
	invitePromptBlocks,
	SLACK_ACTION_IDS,
	toMrkdwn,
} from '../slack-blocks';

const CTX = { baseUrl: 'https://n8n.example.com' };

function basePayload(
	overrides: Partial<InstanceAiConfirmationRequestPayload> = {},
): InstanceAiConfirmationRequestPayload {
	return {
		requestId: 'req-1',
		toolCallId: 'tool-1',
		toolName: 'someTool',
		args: {},
		severity: 'info',
		message: 'Do the thing?',
		...overrides,
	};
}

function findBlock(blocks: unknown[], predicate: (block: Record<string, unknown>) => boolean) {
	return blocks.find(
		(block): block is Record<string, unknown> =>
			typeof block === 'object' && block !== null && predicate(block as Record<string, unknown>),
	);
}

function actionIds(blocks: unknown[]): string[] {
	const ids: string[] = [];
	for (const block of blocks) {
		if (typeof block !== 'object' || block === null) continue;
		const elements = (block as Record<string, unknown>).elements;
		if (!Array.isArray(elements)) continue;
		for (const element of elements) {
			if (typeof element === 'object' && element !== null && 'action_id' in element) {
				ids.push(String((element as Record<string, unknown>).action_id));
			}
		}
	}
	return ids;
}

describe('toMrkdwn', () => {
	it('converts bold', () => {
		expect(toMrkdwn('**bold**')).toBe('*bold*');
	});

	it('converts links', () => {
		expect(toMrkdwn('[text](https://example.com)')).toBe('<https://example.com|text>');
	});

	it('converts headings', () => {
		expect(toMrkdwn('# Heading')).toBe('*Heading*');
	});

	it('escapes ampersand and angle brackets', () => {
		expect(toMrkdwn('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
	});

	it('escapes before converting, so bold text containing angle brackets stays safe', () => {
		expect(toMrkdwn('**a < b**')).toBe('*a &lt; b*');
	});

	it('leaves plain text untouched', () => {
		expect(toMrkdwn('nothing special here')).toBe('nothing special here');
	});
});

describe('confirmationBlocks', () => {
	it('dispatches on setupRequests presence, regardless of inputType', () => {
		const event = basePayload({
			inputType: 'approval',
			workflowId: 'wf-1',
			setupRequests: [
				{
					node: {
						name: 'n1',
						type: 'someNode',
						typeVersion: 1,
						parameters: {},
						position: [0, 0],
						id: 'n1',
					},
					isTrigger: false,
				},
			],
		});

		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([SLACK_ACTION_IDS.link]);
	});

	it('dispatches on credentialRequests presence even without an inputType', () => {
		const event = basePayload({
			inputType: undefined,
			credentialRequests: [
				{
					credentialType: 'slackApi',
					reason: 'Needed to post messages',
					existingCredentials: [{ id: 'cred-1', name: 'My Slack' }],
				},
			],
		});

		const blocks = confirmationBlocks(event, CTX);
		const select = findBlock(blocks, (b) => b.block_id === 'credential:slackApi');
		expect(select).toBeDefined();
		expect(actionIds(blocks)).toEqual([SLACK_ACTION_IDS.credentialSubmit]);
	});

	it('falls back to a deep link when a credential request has no existing credentials', () => {
		const event = basePayload({
			credentialRequests: [
				{ credentialType: 'githubApi', reason: 'Needed for GitHub', existingCredentials: [] },
			],
		});

		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([]);
		const section = findBlock(blocks, (b) => b.type === 'section');
		expect(JSON.stringify(section)).toContain('/home/credentials');
	});

	it('renders domain-access approve/deny buttons when domainAccess is present', () => {
		const event = basePayload({
			domainAccess: { url: 'https://api.example.com', host: 'api.example.com' },
		});
		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([
			SLACK_ACTION_IDS.domainApprove,
			SLACK_ACTION_IDS.domainDeny,
		]);
	});

	it('refuses one-line when channelConfig is present', () => {
		const event = basePayload({ channelConfig: { integrationType: 'slack', agentId: 'agent-1' } });
		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([]);
		expect(JSON.stringify(blocks)).toContain("isn't supported from Slack yet");
	});

	it('renders Allow once / Always allow / Deny buttons for a plain approval, each carrying the requestId', () => {
		const event = basePayload({ inputType: 'approval' });
		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([
			SLACK_ACTION_IDS.approveOnce,
			SLACK_ACTION_IDS.approveSession,
			SLACK_ACTION_IDS.reject,
		]);
		const actionsBlock = findBlock(blocks, (b) => b.type === 'actions');
		const elements = actionsBlock?.elements as Array<Record<string, unknown>>;
		expect(elements.every((el) => el.value === 'req-1')).toBe(true);
		expect(JSON.stringify(blocks)).toContain('for this session');
	});

	it('adds a Review in n8n link when workflowId is present on an approval', () => {
		const event = basePayload({ inputType: 'approval', workflowId: 'wf-9' });
		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([
			SLACK_ACTION_IDS.approveOnce,
			SLACK_ACTION_IDS.approveSession,
			SLACK_ACTION_IDS.reject,
			SLACK_ACTION_IDS.link,
		]);
	});

	it('applies danger style and a confirm dialog to the Allow once button on a destructive approval', () => {
		const event = basePayload({ inputType: 'approval', severity: 'destructive' });
		const blocks = confirmationBlocks(event, CTX);
		const actionsBlock = findBlock(blocks, (b) => b.type === 'actions');
		const elements = actionsBlock?.elements as Array<Record<string, unknown>>;
		const allowOnceButton = elements.find((el) => el.action_id === SLACK_ACTION_IDS.approveOnce);
		expect(allowOnceButton?.style).toBe('danger');
		expect(allowOnceButton?.confirm).toBeDefined();
	});

	it('treats continue the same as approval', () => {
		const event = basePayload({ inputType: 'continue' });
		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([
			SLACK_ACTION_IDS.approveOnce,
			SLACK_ACTION_IDS.approveSession,
			SLACK_ACTION_IDS.reject,
		]);
	});

	it('renders a plain instruction line for a text input', () => {
		const event = basePayload({ inputType: 'text', message: 'What should I call it?' });
		const blocks = confirmationBlocks(event, CTX);
		expect(JSON.stringify(blocks)).toContain('Reply in this thread with your answer');
	});

	it('renders one radio_buttons element per single-choice question, plus a submit button', () => {
		const event = basePayload({
			inputType: 'questions',
			questions: [
				{ id: 'q1', question: 'Pick one', type: 'single', options: ['a', 'b'] },
				{ id: 'q2', question: 'Pick many', type: 'multi', options: ['x', 'y'] },
			],
		});

		const blocks = confirmationBlocks(event, CTX);
		const q1 = findBlock(blocks, (b) => b.block_id === 'question:q1');
		const q2 = findBlock(blocks, (b) => b.block_id === 'question:q2');
		expect((q1?.accessory as Record<string, unknown>).type).toBe('radio_buttons');
		expect((q2?.accessory as Record<string, unknown>).type).toBe('checkboxes');
		expect(actionIds(blocks)).toEqual([SLACK_ACTION_IDS.questionsSubmit]);
	});

	it('renders a checklist and Approve plan / Request changes buttons for plan-review', () => {
		const event = basePayload({
			inputType: 'plan-review',
			tasks: {
				tasks: [
					{ id: 't1', description: 'Create the trigger', status: 'done' },
					{ id: 't2', description: 'Add the HTTP node', status: 'in_progress' },
				],
			},
		});

		const blocks = confirmationBlocks(event, CTX);
		expect(actionIds(blocks)).toEqual([
			SLACK_ACTION_IDS.planApprove,
			SLACK_ACTION_IDS.planRequestChanges,
		]);
		const text = JSON.stringify(blocks);
		expect(text).toContain('Create the trigger');
		expect(text).toContain('Add the HTTP node');
	});

	it('converts a plan task description through toMrkdwn', () => {
		const event = basePayload({
			inputType: 'plan-review',
			tasks: {
				tasks: [
					{
						id: 't1',
						description: '**bold** & <angle> [link](https://x)',
						status: 'todo',
					},
				],
			},
		});

		const blocks = confirmationBlocks(event, CTX);
		const section = findBlock(blocks, (b) => b.type === 'section');
		const text = (section?.text as Record<string, unknown>).text;
		expect(text).toContain('*bold* &amp; &lt;angle&gt; <https://x|link>');
	});

	it('never throws for an unhandled inputType', () => {
		const event = basePayload({
			inputType: 'resource-decision',
			resourceDecision: {
				toolGroup: 'g',
				resource: 'r',
				description: 'd',
				options: ['allowOnce'],
			},
		});
		expect(() => confirmationBlocks(event, CTX)).not.toThrow();
	});
});

describe('errorBlocks', () => {
	it('builds a view-run link and a debug button carrying workflowId:executionId', () => {
		const blocks = errorBlocks({
			workflowName: 'My Workflow',
			workflowId: 'wf-1',
			executionId: 'exec-1',
			reason: 'Node "HTTP Request" failed',
			baseUrl: 'https://n8n.example.com',
			stoppedAt: '2026-08-12T10:00:00.000Z',
		});

		const actionsBlock = findBlock(blocks, (b) => b.type === 'actions');
		const elements = actionsBlock?.elements as Array<Record<string, unknown>>;

		const viewButton = elements.find((el) => el.action_id === SLACK_ACTION_IDS.link);
		expect(viewButton?.url).toBe('https://n8n.example.com/workflow/wf-1/executions/exec-1');

		const debugButton = elements.find((el) => el.action_id === SLACK_ACTION_IDS.debug);
		expect(debugButton?.value).toBe('wf-1:exec-1');
		expect(debugButton?.style).toBe('primary');
	});

	it('converts the reason through toMrkdwn', () => {
		const blocks = errorBlocks({
			workflowName: 'My Workflow',
			workflowId: 'wf-1',
			executionId: 'exec-1',
			reason: 'a & b failed',
			baseUrl: 'https://n8n.example.com',
		});
		expect(JSON.stringify(blocks)).toContain('a &amp; b failed');
	});
});

describe('invitePromptBlocks', () => {
	it('renders Send invite / Ignore buttons carrying the requester email', () => {
		const blocks = invitePromptBlocks({
			requesterName: 'mara@acme.com',
			requesterEmail: 'mara@acme.com',
			channelName: '<#C123>',
		});

		const actionsBlock = findBlock(blocks, (b) => b.type === 'actions');
		const elements = actionsBlock?.elements as Array<Record<string, unknown>>;
		expect(elements.map((el) => el.action_id)).toEqual([
			SLACK_ACTION_IDS.inviteUser,
			SLACK_ACTION_IDS.inviteIgnore,
		]);
		expect(elements.every((el) => el.value === 'mara@acme.com')).toBe(true);
	});

	it('renders an inert invited variant with no buttons', () => {
		const blocks = invitePromptBlocks({
			requesterName: 'mara@acme.com',
			requesterEmail: 'mara@acme.com',
			channelName: '<#C123>',
			resolution: 'invited',
		});
		expect(findBlock(blocks, (b) => b.type === 'actions')).toBeUndefined();
		expect(JSON.stringify(blocks)).toContain('Invited mara@acme.com.');
	});

	it('renders an inert ignored variant with no buttons', () => {
		const blocks = invitePromptBlocks({
			requesterName: 'mara@acme.com',
			requesterEmail: 'mara@acme.com',
			channelName: '<#C123>',
			resolution: 'ignored',
		});
		expect(findBlock(blocks, (b) => b.type === 'actions')).toBeUndefined();
		expect(JSON.stringify(blocks)).toContain('Ignored');
	});
});
