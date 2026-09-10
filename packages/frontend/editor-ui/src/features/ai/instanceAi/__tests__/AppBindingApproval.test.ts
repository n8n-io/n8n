import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { AppBindingMeta } from '@n8n/api-types';
import AppBindingApproval from '@/features/ai/instanceAi/components/AppBindingApproval.vue';
import type { ApprovalOption } from '@/features/ai/instanceAi/components/ApprovalOptionList.vue';

const APP_BINDING: AppBindingMeta = {
	kind: 'workflow',
	appId: 'app-1',
	appName: 'Runner',
	appNamespace: 'runner',
	workflowId: 'wf-1',
	workflowName: 'Echo',
	key: 'submit',
};

const DATA_TABLE_BINDING: AppBindingMeta = {
	kind: 'dataTable',
	appId: 'app-1',
	appName: 'Board',
	appNamespace: 'board',
	dataTableId: 'dt-1',
	dataTableName: 'Tasks',
	key: 'tasks',
	permissions: ['read', 'write'],
	projectId: 'proj-1',
};

const AGENT_BINDING: AppBindingMeta = {
	kind: 'agent',
	appId: 'app-1',
	appName: 'Helpdesk',
	appNamespace: 'helpdesk',
	agentId: 'agent-1',
	agentName: 'Support',
	key: 'support',
	permissions: ['chat', 'history'],
	published: true,
	projectId: 'proj-1',
};

const OPTIONS: ApprovalOption[] = [
	{ key: 'always-allow', icon: 'check-check', label: 'Always allow', testId: 'opt-always-allow' },
	{ key: 'allow-once', icon: 'check', label: 'Allow once', testId: 'opt-allow-once' },
	{ key: 'deny', icon: 'ban', label: 'Deny', testId: 'opt-deny' },
];

const renderComponent = createComponentRenderer(AppBindingApproval, {
	props: { appBinding: APP_BINDING, options: OPTIONS },
});

describe('AppBindingApproval', () => {
	it('shows the app, then the workflow linked in a new tab, and nothing else', () => {
		const { getByTestId, getByText, queryByText } = renderComponent();

		expect(getByText('Allow AI Assistant to connect a workflow to the app?')).toBeInTheDocument();
		const app = getByTestId('instance-ai-app-binding-app');
		const link = getByTestId('instance-ai-app-binding-workflow');
		expect(app).toHaveTextContent('Runner');
		expect(link).toHaveTextContent('Echo');
		expect(link).toHaveAttribute('href', '/workflow/wf-1');
		expect(link).toHaveAttribute('target', '_blank');
		expect(app.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(queryByText(/submit/)).toBeNull();
	});

	it('emits the selected option key', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('opt-allow-once'));
		await userEvent.click(getByTestId('opt-deny'));

		expect(emitted('select')).toEqual([['allow-once'], ['deny']]);
	});

	it('shows the app, the data table linked in a new tab, and the read-write access line', () => {
		const { getByTestId, getByText, queryByTestId, queryByText } = renderComponent({
			props: { appBinding: DATA_TABLE_BINDING },
		});

		expect(getByText('Allow AI Assistant to connect a data table to the app?')).toBeInTheDocument();
		expect(getByTestId('instance-ai-app-binding-app')).toHaveTextContent('Board');
		const link = getByTestId('instance-ai-app-binding-data-table');
		expect(link).toHaveTextContent('Tasks');
		expect(link).toHaveAttribute('href', '/projects/proj-1/datatables/dt-1');
		expect(link).toHaveAttribute('target', '_blank');
		expect(getByTestId('instance-ai-app-binding-access')).toHaveTextContent(
			'Anyone who can open the app can read and change rows in this table.',
		);
		expect(queryByTestId('instance-ai-app-binding-workflow')).toBeNull();
		expect(queryByText(/tasks/)).toBeNull();
	});

	it('shows the read-only access line for a read-only data table binding', () => {
		const { getByTestId } = renderComponent({
			props: { appBinding: { ...DATA_TABLE_BINDING, permissions: ['read'] } },
		});

		expect(getByTestId('instance-ai-app-binding-access')).toHaveTextContent(
			'Anyone who can open the app can read this table.',
		);
	});

	it('shows the write-only access line for a data table binding without read', () => {
		const { getByTestId } = renderComponent({
			props: { appBinding: { ...DATA_TABLE_BINDING, permissions: ['write'] } },
		});

		expect(getByTestId('instance-ai-app-binding-access')).toHaveTextContent(
			'Anyone who can open the app can add and change rows in this table, but not read them.',
		);
	});

	it('emits the selected option key for a data table binding', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { appBinding: DATA_TABLE_BINDING },
		});

		await userEvent.click(getByTestId('opt-always-allow'));

		expect(emitted('select')).toEqual([['always-allow']]);
	});

	it('shows the app, the agent linked in a new tab, the chat-and-history access line and the approvals line', () => {
		const { getByTestId, getByText, queryByTestId, queryByText } = renderComponent({
			props: { appBinding: AGENT_BINDING },
		});

		expect(getByText('Allow AI Assistant to connect an agent to the app?')).toBeInTheDocument();
		expect(getByTestId('instance-ai-app-binding-app')).toHaveTextContent('Helpdesk');
		const link = getByTestId('instance-ai-app-binding-agent');
		expect(link).toHaveTextContent('Support');
		expect(link).toHaveAttribute('href', '/projects/proj-1/agents/agent-1');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link.parentElement?.querySelector('[data-icon="robot"]')).not.toBeNull();
		expect(getByTestId('instance-ai-app-binding-access')).toHaveTextContent(
			'Visitors can chat with this agent and read back their conversation.',
		);
		expect(getByTestId('instance-ai-app-binding-approvals')).toHaveTextContent(
			"Visitors answer the agent's approval requests.",
		);
		expect(queryByTestId('instance-ai-app-binding-not-published')).toBeNull();
		expect(queryByTestId('instance-ai-app-binding-workflow')).toBeNull();
		expect(queryByTestId('instance-ai-app-binding-data-table')).toBeNull();
		expect(queryByText(/support/)).toBeNull();
	});

	it.each([
		[['chat'], 'Visitors can chat with this agent.'],
		[['history'], 'Visitors can read back their conversation with this agent.'],
	] as const)('shows the access line for agent permissions %j', (permissions, text) => {
		const { getByTestId } = renderComponent({
			props: { appBinding: { ...AGENT_BINDING, permissions: [...permissions] } },
		});

		expect(getByTestId('instance-ai-app-binding-access')).toHaveTextContent(text);
	});

	it('warns when the agent is not published', () => {
		const { getByTestId } = renderComponent({
			props: { appBinding: { ...AGENT_BINDING, published: false } },
		});

		expect(getByTestId('instance-ai-app-binding-not-published')).toHaveTextContent(
			'Not published — the app cannot chat yet',
		);
	});
});
