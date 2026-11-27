import type { McpServerResponse, McpServerToolCandidate } from '@n8n/api-types';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { defineComponent } from 'vue';

import McpServerAssistantPanel from './McpServerAssistantPanel.vue';

const api = vi.hoisted(() => ({ listToolCandidates: vi.fn() }));
vi.mock('../mcp-servers.api', () => api);

const SERVER_ID = '0190a8d6-4a2e-7000-8000-000000000001';

const server: McpServerResponse = {
	id: SERVER_ID,
	projectId: 'project-1',
	project: { name: 'Marketing', type: 'team' },
	name: 'Marketing tools',
	slug: 'marketing-tools',
	description: '',
	createdAt: '2026-11-24T10:00:00.000Z',
	updatedAt: '2026-11-24T10:00:00.000Z',
};

/** The shell panel. It shows its props so that the test can read them. */
const AssistantPanelStub = defineComponent({
	name: 'AssistantPanelStub',
	props: ['subject', 'prefill'],
	emits: ['close', 'subject-changed'],
	template: `<div data-test-id="assistant-panel-stub">
		<span data-test-id="stub-subject">{{ JSON.stringify(subject) }}</span>
		<span data-test-id="stub-prefill">{{ prefill ? JSON.stringify(prefill) : '' }}</span>
		<button data-test-id="stub-changed" type="button" @click="$emit('subject-changed')" />
		<button data-test-id="stub-close" type="button" @click="$emit('close')" />
		<slot name="subject" /><slot name="empty" />
	</div>`,
});

function candidate(overrides: Partial<McpServerToolCandidate>): McpServerToolCandidate {
	return { workflowId: 'wf-1', name: 'Workflow', description: null, reason: null, ...overrides };
}

const renderComponent = createComponentRenderer(McpServerAssistantPanel, {
	props: { server },
});

describe('McpServerAssistantPanel', () => {
	beforeEach(() => {
		componentRegistry.register('assistant-panel', AssistantPanelStub);
		api.listToolCandidates.mockResolvedValue([]);
	});

	afterEach(() => {
		componentRegistry.clear();
		vi.clearAllMocks();
	});

	it('binds the Assistant to the server and names the server', async () => {
		renderComponent();

		expect(JSON.parse(screen.getByTestId('stub-subject').textContent ?? '')).toEqual({
			type: 'mcpServer',
			id: SERVER_ID,
			projectId: 'project-1',
			name: 'Marketing tools',
		});
		expect(screen.getByText('Works on this MCP server')).toBeInTheDocument();
		expect(screen.getByTestId('mcp-assistant-server-name')).toHaveTextContent('Marketing tools');
	});

	it('names only positive actions in the intro', () => {
		renderComponent();

		expect(screen.getByTestId('mcp-assistant-intro')).toHaveTextContent(
			'Ask me to add tools, improve their descriptions, or get a workflow ready to be a tool. I change the page for you.',
		);
	});

	it('suggests the trigger for a workflow of the project that needs it', async () => {
		api.listToolCandidates.mockResolvedValue([
			candidate({ workflowId: 'wf-1', name: 'Draft only', reason: 'not_published' }),
			candidate({ workflowId: 'wf-2', name: 'Weekly newsletter', reason: 'missing_trigger' }),
			candidate({ workflowId: 'wf-3', name: 'Monthly report', reason: 'missing_trigger' }),
		]);
		renderComponent();

		const suggestions = await screen.findAllByTestId('mcp-assistant-suggestion');
		expect(suggestions).toHaveLength(1);
		expect(suggestions[0]).toHaveTextContent(
			"Add the trigger 'When Executed by Another Workflow' to Weekly newsletter, so that it can be a tool.",
		);
		expect(api.listToolCandidates).toHaveBeenCalledWith(expect.anything(), 'project-1', SERVER_ID);
	});

	it('suggests to add the workflows that fit when no workflow needs the trigger', async () => {
		api.listToolCandidates.mockResolvedValue([candidate({ reason: null })]);
		renderComponent();

		await waitFor(() =>
			expect(screen.getByTestId('mcp-assistant-suggestion')).toHaveTextContent(
				'Add the workflows that fit this server.',
			),
		);
	});

	it('still suggests to add the workflows when the workflows do not load', async () => {
		api.listToolCandidates.mockRejectedValue(new Error('Network'));
		renderComponent();

		await waitFor(() =>
			expect(screen.getByTestId('mcp-assistant-suggestion')).toHaveTextContent(
				'Add the workflows that fit this server.',
			),
		);
	});

	it('puts the suggestion in the message input without a send', async () => {
		api.listToolCandidates.mockResolvedValue([
			candidate({ name: 'Weekly newsletter', reason: 'missing_trigger' }),
		]);
		renderComponent();

		await userEvent.click(await screen.findByTestId('mcp-assistant-suggestion'));

		expect(JSON.parse(screen.getByTestId('stub-prefill').textContent ?? '')).toEqual({
			text: "Add the trigger 'When Executed by Another Workflow' to Weekly newsletter, so that it can be a tool.",
			prefillType: 'mcp_server_suggestion',
		});
	});

	it('passes on the prompt of the page', async () => {
		const prefill = {
			text: 'Build out the server.',
			prefillType: 'mcp_server_build_prompt' as const,
		};
		renderComponent({ props: { server, prefill } });

		expect(JSON.parse(screen.getByTestId('stub-prefill').textContent ?? '')).toEqual(prefill);
	});

	it('loads the suggestion again after the Assistant changes the server', async () => {
		api.listToolCandidates.mockResolvedValueOnce([
			candidate({ workflowId: 'wf-2', name: 'Weekly newsletter', reason: 'missing_trigger' }),
		]);
		renderComponent();
		await screen.findByText(
			"Add the trigger 'When Executed by Another Workflow' to Weekly newsletter, so that it can be a tool.",
		);
		api.listToolCandidates.mockResolvedValueOnce([candidate({ workflowId: 'wf-2', reason: null })]);

		await userEvent.click(screen.getByTestId('stub-changed'));

		await waitFor(() =>
			expect(screen.getByTestId('mcp-assistant-suggestion')).toHaveTextContent(
				'Add the workflows that fit this server.',
			),
		);
	});

	it('passes on a change of the server and the close', async () => {
		const { emitted } = renderComponent();

		await userEvent.click(screen.getByTestId('stub-changed'));
		await userEvent.click(screen.getByTestId('stub-close'));

		expect(emitted('changed')).toHaveLength(1);
		expect(emitted('close')).toHaveLength(1);
	});
});
