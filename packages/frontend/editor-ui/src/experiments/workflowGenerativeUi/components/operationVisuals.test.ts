import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import AiTask from './AiTask.vue';
import Approval from './Approval.vue';
import CalendarEvent from './CalendarEvent.vue';
import ChatMessage from './ChatMessage.vue';
import Crm from './Crm.vue';
import Database from './Database.vue';
import Decision from './Decision.vue';
import Email from './Email.vue';
import FileTransfer from './FileTransfer.vue';
import Form from './Form.vue';
import HttpCall from './HttpCall.vue';
import Spreadsheet from './Spreadsheet.vue';
import Terminal from './Terminal.vue';
import When from './When.vue';

type OperationCase = {
	name: string;
	component: Component;
	file: string;
	props: Record<string, unknown>;
	testId: string;
	content: string[];
};

const cases: OperationCase[] = [
	{
		name: 'When',
		component: When,
		file: 'When.vue',
		props: {
			kind: 'appEvent',
			app: 'Slack',
			summary: 'When someone posts in #incidents',
			nodeId: 'node-1',
		},
		testId: 'trigger-marker',
		content: ['App event trigger', 'Slack', 'When someone posts in #incidents'],
	},
	{
		name: 'Form',
		component: Form,
		file: 'Form.vue',
		props: {
			title: 'Candidate application',
			fields: [
				{ label: 'Full name', type: 'text' },
				{ label: 'Email', type: 'email' },
			],
			nodeId: 'node-1',
		},
		testId: 'form-sheet',
		content: ['Candidate application', 'Full name', 'Email'],
	},
	{
		name: 'Crm',
		component: Crm,
		file: 'Crm.vue',
		props: {
			app: 'HubSpot',
			operation: 'Create',
			object: 'Contact',
			matchOn: 'email',
			nodeId: 'node-1',
		},
		testId: 'crm-record',
		content: ['HubSpot', 'Create', 'Contact', 'email'],
	},
	{
		name: 'ChatMessage',
		component: ChatMessage,
		file: 'ChatMessage.vue',
		props: {
			app: 'Slack',
			to: '#incidents',
			bodyPreview: 'Checkout is failing for 12% of sessions',
			nodeId: 'node-1',
		},
		testId: 'chat-thread',
		content: ['Slack', '#incidents', 'Checkout is failing for 12% of sessions'],
	},
	{
		name: 'Email',
		component: Email,
		file: 'Email.vue',
		props: {
			to: 'ops@example.com',
			subject: 'Service degraded',
			bodyPreview: 'The payment API returned 500s for ten minutes.',
			nodeId: 'node-1',
		},
		testId: 'email-message',
		content: [
			'ops@example.com',
			'Service degraded',
			'The payment API returned 500s for ten minutes.',
		],
	},
	{
		name: 'HttpCall',
		component: HttpCall,
		file: 'HttpCall.vue',
		props: { method: 'post', url: 'https://api.example.com/incidents', nodeId: 'node-1' },
		testId: 'http-exchange',
		content: ['POST', 'https://api.example.com/incidents'],
	},
	{
		name: 'Decision',
		component: Decision,
		file: 'Decision.vue',
		props: {
			question: 'Is the lead qualified?',
			branches: [
				{ label: 'Qualified', condition: 'Company size is above 200' },
				{ label: 'Nurture', condition: 'Everything else' },
			],
			nodeId: 'node-1',
		},
		testId: 'decision-branches',
		content: ['Is the lead qualified?', 'Qualified', 'Company size is above 200', 'Nurture'],
	},
	{
		name: 'Terminal',
		component: Terminal,
		file: 'Terminal.vue',
		props: { command: 'systemctl restart api', cwd: '/srv/api', nodeId: 'node-1' },
		testId: 'terminal-console',
		content: ['/srv/api', 'systemctl restart api'],
	},
	{
		name: 'FileTransfer',
		component: FileTransfer,
		file: 'FileTransfer.vue',
		props: {
			direction: 'upload',
			app: 'Google Drive',
			path: '/reports/weekly.csv',
			nodeId: 'node-1',
		},
		testId: 'file-transfer',
		content: ['Uploads to', 'Google Drive', '/reports/weekly.csv'],
	},
	{
		name: 'Database',
		component: Database,
		file: 'Database.vue',
		props: { operation: 'insert', table: 'incidents', nodeId: 'node-1' },
		testId: 'database-records',
		content: ['insert', 'incidents'],
	},
	{
		name: 'Spreadsheet',
		component: Spreadsheet,
		file: 'Spreadsheet.vue',
		props: { app: 'Google Sheets', operation: 'append', sheet: 'Leads 2026', nodeId: 'node-1' },
		testId: 'spreadsheet-grid',
		content: ['Google Sheets', 'append', 'Leads 2026'],
	},
	{
		name: 'CalendarEvent',
		component: CalendarEvent,
		file: 'CalendarEvent.vue',
		props: {
			title: 'Interview with Dana',
			when: 'Tue 18 Aug, 14:00',
			attendees: 'dana@example.com, hiring@example.com',
			nodeId: 'node-1',
		},
		testId: 'calendar-event',
		content: ['Interview with Dana', 'Tue 18 Aug, 14:00', 'dana@example.com'],
	},
	{
		name: 'AiTask',
		component: AiTask,
		file: 'AiTask.vue',
		props: {
			task: 'Qualify the lead',
			promptExcerpt: 'Score this lead from 1 to 5 based on fit',
			model: 'gpt-4.1',
			tools: ['CRM lookup', 'Web search'],
			nodeId: 'node-1',
		},
		testId: 'ai-task',
		content: [
			'Qualify the lead',
			'Score this lead from 1 to 5 based on fit',
			'gpt-4.1',
			'CRM lookup',
		],
	},
	{
		name: 'Approval',
		component: Approval,
		file: 'Approval.vue',
		props: { via: 'Slack', waitingFor: 'the on-call engineer', nodeId: 'node-1' },
		testId: 'approval-request',
		content: ['the on-call engineer', 'Slack'],
	},
];

const motionPattern = /@keyframes|animation|transition|data-motion|\bmotion\b/;

function renderCase(operation: OperationCase, props: Record<string, unknown> = {}) {
	return createComponentRenderer(operation.component, {
		props: { ...operation.props, pressBound: true, ...props },
		global: { stubs: { NodeBrand: true } },
	})();
}

describe('node-adapted operation visuals', () => {
	it.each(cases)('$name owns its visual chrome and content', (operation) => {
		const { getByTestId, queryByTestId, container } = renderCase(operation);

		expect(getByTestId(operation.testId)).toBeInTheDocument();
		expect(queryByTestId('generic-action-card')).not.toBeInTheDocument();

		for (const text of operation.content) {
			expect(container.textContent).toContain(text);
		}
	});

	it.each(cases)('$name shows the real node brand', (operation) => {
		const { container } = renderCase(operation);

		expect(container.querySelector('node-brand-stub')).not.toBeNull();
	});

	it.each(cases)('$name keeps press and keyboard behavior', async (operation) => {
		const { emitted, getByRole } = renderCase(operation);
		const surface = getByRole('button');

		await fireEvent.click(surface);
		await fireEvent.keyDown(surface, { key: 'Enter' });

		expect(emitted().press).toHaveLength(2);
	});

	it.each(cases)('$name is look-only without a press binding', (operation) => {
		const { queryByRole } = renderCase(operation, { pressBound: false });

		expect(queryByRole('button')).not.toBeInTheDocument();
	});

	it.each(cases)('$name renders no motion', (operation) => {
		const { container } = renderCase(operation);

		expect(container.querySelector('[data-motion]')).toBeNull();
		for (const element of container.querySelectorAll('*')) {
			for (const token of element.classList) {
				expect(token).not.toMatch(/(^|_)(pulse|flow|transfer|progress)(_|$)/);
			}
		}
	});

	it.each(cases)('$name source carries no motion code', (operation) => {
		const source = readFileSync(resolve(__dirname, operation.file), 'utf8');

		expect(source).not.toMatch(motionPattern);
	});
});

describe('operation structure details', () => {
	it('renders one branch row per decision branch', () => {
		const decision = cases.find((operation) => operation.name === 'Decision')!;
		const { getAllByTestId } = renderCase(decision);

		expect(getAllByTestId('decision-branch')).toHaveLength(2);
	});

	it('renders one captured field per form field', () => {
		const form = cases.find((operation) => operation.name === 'Form')!;
		const { getAllByTestId } = renderCase(form);

		expect(getAllByTestId('form-field')).toHaveLength(2);
	});

	it('renders each AI tool as its own chip', () => {
		const aiTask = cases.find((operation) => operation.name === 'AiTask')!;
		const { getAllByTestId } = renderCase(aiTask);

		expect(getAllByTestId('ai-task-tool')).toHaveLength(2);
	});

	it('keeps the chat bubble inside a channel thread', () => {
		const chat = cases.find((operation) => operation.name === 'ChatMessage')!;
		const { getByTestId } = renderCase(chat);

		expect(getByTestId('chat-thread')).toContainElement(getByTestId('chat-bubble'));
	});

	it('separates email headers from the message body', () => {
		const email = cases.find((operation) => operation.name === 'Email')!;
		const { getByTestId } = renderCase(email);

		expect(getByTestId('email-headers').textContent).toContain('ops@example.com');
		expect(getByTestId('email-body').textContent).toContain('The payment API returned 500s');
	});

	it('pairs the HTTP request line with a response lane', () => {
		const http = cases.find((operation) => operation.name === 'HttpCall')!;
		const { getByTestId } = renderCase(http);

		expect(getByTestId('http-request-line').textContent).toContain('POST');
		expect(getByTestId('http-response-lane')).toBeInTheDocument();
	});

	it('renders the terminal command as a console line', () => {
		const terminal = cases.find((operation) => operation.name === 'Terminal')!;
		const { getByTestId } = renderCase(terminal);
		const command = getByTestId('terminal-command');

		expect(command.tagName).toBe('PRE');
		expect(command.textContent).toContain('$ systemctl restart api');
	});

	it('moves a file between two endpoints', () => {
		const file = cases.find((operation) => operation.name === 'FileTransfer')!;
		const { getAllByTestId } = renderCase(file);
		const endpoints = getAllByTestId('file-endpoint');

		expect(endpoints).toHaveLength(2);
		expect(endpoints[0].textContent).toContain('Google Drive');
		expect(endpoints[1].textContent).toContain('/reports/weekly.csv');
	});

	it('shows who must respond and through which channel', () => {
		const approval = cases.find((operation) => operation.name === 'Approval')!;
		const { getByTestId } = renderCase(approval);

		expect(getByTestId('approval-waiting-for').textContent).toContain('the on-call engineer');
		expect(getByTestId('approval-channel').textContent).toContain('Slack');
	});

	it('invents no approval status or decision actions', () => {
		const approval = cases.find((operation) => operation.name === 'Approval')!;
		const { container, queryByText } = renderCase(approval);

		for (const invented of ['Approve', 'Decline', 'Reject', 'Awaiting', 'Pending']) {
			expect(container.textContent).not.toContain(invented);
			expect(queryByText(invented, { exact: false })).not.toBeInTheDocument();
		}
	});

	it('leaves the form value chrome empty and keeps the type as metadata', () => {
		const form = cases.find((operation) => operation.name === 'Form')!;
		const { getAllByTestId } = renderCase(form);
		const values = getAllByTestId('form-field-input');
		const types = getAllByTestId('form-field-type');

		expect(values).toHaveLength(2);
		for (const value of values) {
			expect(value.textContent).toBe('');
		}

		expect(types.map((type) => type.textContent?.trim())).toEqual(['text', 'email']);
		for (const type of types) {
			expect(values.some((value) => value.contains(type))).toBe(false);
		}
	});

	it('omits optional CRM and calendar details when they are missing', () => {
		const crm = cases.find((operation) => operation.name === 'Crm')!;
		const calendar = cases.find((operation) => operation.name === 'CalendarEvent')!;

		expect(renderCase(crm, { matchOn: null }).queryByTestId('crm-match')).not.toBeInTheDocument();
		expect(
			renderCase(calendar, { attendees: null }).queryByTestId('calendar-attendees'),
		).not.toBeInTheDocument();
	});
});
