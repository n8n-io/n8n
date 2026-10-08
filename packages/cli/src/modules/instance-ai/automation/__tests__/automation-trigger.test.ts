import {
	type AutomationNode,
	canStartAutomation,
	classifyAutomationTrigger,
	triggerKindOf,
} from '../automation-trigger';

// Node types from the spec, written out on purpose and not taken from the implementation.
const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';
const CRON = 'n8n-nodes-base.cron';
const INTERVAL = 'n8n-nodes-base.interval';
const WEBHOOK = 'n8n-nodes-base.webhook';
const MCP_TRIGGER = '@n8n/n8n-nodes-langchain.mcpTrigger';
const FORM = 'n8n-nodes-base.formTrigger';
const CHAT = '@n8n/n8n-nodes-langchain.chatTrigger';
const MANUAL = 'n8n-nodes-base.manualTrigger';
const MANUAL_CHAT = '@n8n/n8n-nodes-langchain.manualChatTrigger';
const LEGACY_START = 'n8n-nodes-base.start';
const SLACK_TRIGGER = 'n8n-nodes-base.slackTrigger';
const EMAIL_IMAP = 'n8n-nodes-base.emailReadImap';
const EXECUTE_WORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';
const ERROR_TRIGGER = 'n8n-nodes-base.errorTrigger';
const EVALUATION_TRIGGER = 'n8n-nodes-base.evaluationTrigger';
const SLACK = 'n8n-nodes-base.slack';
const STICKY = 'n8n-nodes-base.stickyNote';

const node = (type: string, name = type.split('.').at(-1) ?? type, disabled?: boolean) =>
	({ name, type, ...(disabled === undefined ? {} : { disabled }) }) satisfies AutomationNode;

describe('triggerKindOf', () => {
	it.each([
		[SCHEDULE, 'schedule'],
		[CRON, 'schedule'],
		[INTERVAL, 'schedule'],
		[WEBHOOK, 'webhook'],
		[MCP_TRIGGER, 'webhook'],
		[FORM, 'form'],
		[CHAT, 'chat'],
		[MANUAL, 'manual'],
		[MANUAL_CHAT, 'manual'],
		[LEGACY_START, 'manual'],
		[SLACK_TRIGGER, 'app-event'],
		['n8n-nodes-base.githubTrigger', 'app-event'],
		['@acme/n8n-nodes-crm.dealTrigger', 'app-event'],
		[EMAIL_IMAP, 'other'],
		['n8n-nodes-base.telegramBot', 'other'],
		['n8n-nodes-base.mytrigger', 'other'],
	])('classifies %s as %s', (type, kind) => {
		expect(triggerKindOf(type)).toBe(kind);
	});

	it.each([
		EXECUTE_WORKFLOW_TRIGGER,
		ERROR_TRIGGER,
		EVALUATION_TRIGGER,
		SLACK,
		STICKY,
		'n8n-nodes-base.noOp',
		'',
		'constructor',
		'__proto__',
		'toString',
	])('does not treat %j as a trigger of an automation', (type) => {
		expect(triggerKindOf(type)).toBeUndefined();
	});
});

describe('canStartAutomation', () => {
	it.each([SCHEDULE, CRON, WEBHOOK, FORM, CHAT, SLACK_TRIGGER, EMAIL_IMAP])(
		'is true for %s, which starts the workflow on its own',
		(type) => {
			expect(canStartAutomation(type)).toBe(true);
		},
	);

	it.each([
		MANUAL,
		MANUAL_CHAT,
		LEGACY_START,
		EXECUTE_WORKFLOW_TRIGGER,
		ERROR_TRIGGER,
		EVALUATION_TRIGGER,
		SLACK,
		STICKY,
		'',
	])('is false for %j, which a person or n8n must start', (type) => {
		expect(canStartAutomation(type)).toBe(false);
	});
});

describe('classifyAutomationTrigger', () => {
	it.each([
		['a schedule', SCHEDULE, 'schedule'],
		['a webhook', WEBHOOK, 'webhook'],
		['a form', FORM, 'form'],
		['a chat', CHAT, 'chat'],
		['an app event', SLACK_TRIGGER, 'app-event'],
		['an older polling node', EMAIL_IMAP, 'other'],
	])('finds %s trigger that can turn the workflow on', (_label, type, kind) => {
		const trigger = classifyAutomationTrigger([node(type, 'Start'), node(SLACK, 'Send')]);

		expect(trigger).toEqual({ kind, node: { name: 'Start', type }, canActivate: true });
	});

	it('finds a manual trigger that cannot turn the workflow on', () => {
		const trigger = classifyAutomationTrigger([node(MANUAL, 'Click'), node(SLACK, 'Send')]);

		expect(trigger).toEqual({
			kind: 'manual',
			node: { name: 'Click', type: MANUAL },
			canActivate: false,
		});
	});

	it.each([
		['no nodes', []],
		['only action nodes and notes', [node(SLACK), node(STICKY)]],
		['only triggers that n8n calls', [node(EXECUTE_WORKFLOW_TRIGGER), node(ERROR_TRIGGER)]],
	])('reports a manual workflow without a trigger node for %s', (_label, nodes) => {
		expect(classifyAutomationTrigger(nodes)).toEqual({ kind: 'manual', canActivate: false });
	});

	it('takes the first trigger that is not manual', () => {
		const trigger = classifyAutomationTrigger([
			node(MANUAL, 'Click'),
			node(SLACK, 'Send'),
			node(WEBHOOK, 'Hook'),
			node(SCHEDULE, 'Daily'),
		]);

		expect(trigger).toEqual({
			kind: 'webhook',
			node: { name: 'Hook', type: WEBHOOK },
			canActivate: true,
		});
	});

	it('takes the first manual trigger when every trigger is manual', () => {
		const trigger = classifyAutomationTrigger([
			node(SLACK, 'Send'),
			node(MANUAL_CHAT, 'Chat by hand'),
			node(MANUAL, 'Click'),
		]);

		expect(trigger.node).toEqual({ name: 'Chat by hand', type: MANUAL_CHAT });
		expect(trigger.canActivate).toBe(false);
	});

	it('ignores disabled triggers', () => {
		const trigger = classifyAutomationTrigger([
			node(SCHEDULE, 'Daily', true),
			node(MANUAL, 'Off', true),
			node(MANUAL, 'Click', false),
		]);

		expect(trigger).toEqual({
			kind: 'manual',
			node: { name: 'Click', type: MANUAL },
			canActivate: false,
		});
	});

	it('reports no trigger when the only trigger is disabled', () => {
		expect(classifyAutomationTrigger([node(FORM, 'Form', true)])).toEqual({
			kind: 'manual',
			canActivate: false,
		});
	});

	it('returns only the name and type of the trigger node', () => {
		const withExtras = { ...node(SCHEDULE, 'Daily'), parameters: { rule: {} }, id: 'n1' };

		expect(classifyAutomationTrigger([withExtras]).node).toStrictEqual({
			name: 'Daily',
			type: SCHEDULE,
		});
	});
});
