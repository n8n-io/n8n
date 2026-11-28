import type { McpServerToolCandidate } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiMcpServerEmptyState from '../components/InstanceAiMcpServerEmptyState.vue';

const listToolCandidates = vi.hoisted(() => vi.fn());
vi.mock('@n8n/frontend-module-mcp-servers', () => ({
	listToolCandidates,
}));

const renderEmptyState = createComponentRenderer(InstanceAiMcpServerEmptyState, {
	pinia: createTestingPinia(),
	props: {
		projectId: 'project-1',
		serverId: 'srv-1',
	},
});

const usableCandidate: McpServerToolCandidate = {
	workflowId: 'wf-1',
	name: 'Get campaign numbers',
	description: 'Numbers',
	reason: null,
};

const missingTriggerCandidate: McpServerToolCandidate = {
	workflowId: 'wf-2',
	name: 'Weekly newsletter',
	description: null,
	reason: 'missing_trigger',
};

describe('InstanceAiMcpServerEmptyState', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows the positive intro and suggests adding the missing trigger when a workflow needs it', async () => {
		listToolCandidates.mockResolvedValue([usableCandidate, missingTriggerCandidate]);
		const { emitted } = renderEmptyState();

		expect(screen.getByTestId('mcp-assistant-intro')).toHaveTextContent(
			'Ask me to add tools, improve their descriptions, or get a workflow ready to be a tool. I change the page for you.',
		);
		const suggestion = await screen.findByTestId('mcp-assistant-suggestion');
		expect(suggestion).toHaveTextContent(
			"Add the trigger 'When Executed by Another Workflow' to Weekly newsletter, so that it can be a tool.",
		);

		await userEvent.click(suggestion);
		expect(emitted('select')).toEqual([
			[
				{
					text: "Add the trigger 'When Executed by Another Workflow' to Weekly newsletter, so that it can be a tool.",
					prefillType: 'mcp_server_suggestion',
				},
			],
		]);
	});

	it('falls back to suggesting adding workflows when no workflow needs the trigger', async () => {
		listToolCandidates.mockResolvedValue([usableCandidate]);
		const { emitted } = renderEmptyState();

		const suggestion = await screen.findByTestId('mcp-assistant-suggestion');
		expect(suggestion).toHaveTextContent('Add the workflows that fit this server.');

		await userEvent.click(suggestion);
		expect(emitted('select')).toEqual([
			[
				{
					text: 'Add the workflows that fit this server.',
					prefillType: 'mcp_server_suggestion',
				},
			],
		]);
	});

	it('falls back to adding workflows when loading candidates fails', async () => {
		listToolCandidates.mockRejectedValue(new Error('Network error'));
		renderEmptyState();

		const suggestion = await screen.findByTestId('mcp-assistant-suggestion');
		expect(suggestion).toHaveTextContent('Add the workflows that fit this server.');
	});
});
