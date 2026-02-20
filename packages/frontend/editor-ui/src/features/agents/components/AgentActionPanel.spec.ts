import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import AgentActionPanel from './AgentActionPanel.vue';
import { useAgentPanelStore } from '../agentPanel.store';
import { useAgentsStore } from '../agents.store';

const renderComponent = createComponentRenderer(AgentActionPanel);

describe('AgentActionPanel', () => {
	function setup(panelOverrides: Partial<ReturnType<typeof useAgentPanelStore>> = {}) {
		const pinia = createTestingPinia();
		const panelStore = mockedStore(useAgentPanelStore);
		const agentsStore = mockedStore(useAgentsStore);

		// Minimal agent setup so the panel renders
		const mockAgent = {
			id: 'agent-1',
			firstName: 'TestAgent',
			lastName: '',
			email: 'test@n8n.local',
			role: 'QA',
			avatar: { type: 'initials' as const, value: 'TA' },
			status: 'idle' as const,
			position: { x: 0, y: 0 },
			zoneId: null,
			workflowCount: 0,
			tasksCompleted: 0,
			lastActive: '',
			resourceUsage: 0,
		};

		agentsStore.agents = [mockAgent];
		panelStore.panelOpen = true;
		panelStore.panelAgentId = 'agent-1';
		panelStore.isLoading = false;
		panelStore.capabilities = {
			agentId: 'agent-1',
			agentName: 'TestAgent',
			llmConfigured: true,
			projects: [],
			workflows: [],
			credentials: [],
		};

		// Apply overrides
		Object.assign(panelStore, panelOverrides);

		const result = renderComponent({ pinia });
		return { ...result, panelStore, agentsStore };
	}

	describe('summary card visibility', () => {
		it('should show summary card when there are steps and a summary', () => {
			const { getByText } = setup({
				streamingSteps: [{ action: 'execute_workflow', workflowName: 'Report', status: 'success' }],
				streamingSummary: 'Task completed successfully',
				isStreaming: false,
			});

			expect(getByText('Task completed successfully')).toBeVisible();
		});

		it('should show summary card when agent completes immediately without steps', () => {
			const { getByText } = setup({
				streamingSteps: [],
				streamingSummary: 'I can help with QA tasks',
				isStreaming: false,
			});

			expect(getByText('I can help with QA tasks')).toBeVisible();
		});

		it('should not show "Live Progress" heading when only summary exists (no steps)', () => {
			const { queryByText } = setup({
				streamingSteps: [],
				streamingSummary: 'Direct answer with no steps',
				isStreaming: false,
			});

			expect(queryByText('Live Progress')).not.toBeInTheDocument();
			expect(queryByText('Direct answer with no steps')).toBeVisible();
		});

		it('should show "Live Progress" heading when steps exist', () => {
			const { getByText } = setup({
				streamingSteps: [{ action: 'execute_workflow', workflowName: 'Report', status: 'success' }],
				streamingSummary: 'Done',
				isStreaming: false,
			});

			expect(getByText('Live Progress')).toBeVisible();
		});

		it('should show thinking dots while streaming with no steps yet', () => {
			const { container, getByText } = setup({
				streamingSteps: [],
				streamingSummary: null,
				isStreaming: true,
			});

			expect(getByText('Live Progress')).toBeVisible();
			expect(container.querySelector('[class*="thinking"]')).toBeInTheDocument();
		});

		it('should not show streaming section when idle (no steps, no summary, not streaming)', () => {
			const { queryByText } = setup({
				streamingSteps: [],
				streamingSummary: null,
				isStreaming: false,
			});

			expect(queryByText('Live Progress')).not.toBeInTheDocument();
		});
	});
});
