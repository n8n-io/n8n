import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import BuilderCard from '../components/BuilderCard.vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => ({
		fetchWorkflow: vi.fn().mockResolvedValue({
			id: 'wf-1',
			name: 'Test WF',
			nodes: [{ name: 'Start' }],
			connections: {},
		}),
	})),
}));

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(() => ({
		amendAgent: vi.fn(),
	})),
}));

const renderComponent = createComponentRenderer(BuilderCard, {
	global: {
		stubs: {
			WorkflowMiniCanvas: { template: '<div data-test-id="mini-canvas" />' },
			WorkflowPreview: { template: '<div data-test-id="wf-preview" />' },
			AgentTimeline: { template: '<div data-test-id="agent-timeline" />' },
			ExecutionPreviewCard: { template: '<div />' },
			CollapsibleRoot: { template: '<div><slot /></div>' },
			CollapsibleTrigger: { template: '<button><slot /></button>' },
			CollapsibleContent: { template: '<div><slot /></div>' },
		},
	},
});

function makeCompletedBuilderNode(
	overrides: Partial<InstanceAiAgentNode> = {},
): InstanceAiAgentNode {
	return {
		agentId: 'builder-1',
		role: 'workflow-builder',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [
			{
				toolCallId: 'tc-build-1',
				toolName: 'build-workflow',
				args: {},
				isLoading: false,
				result: {
					success: true,
					workflowId: 'wf-1',
					workflowName: 'My Workflow',
				},
			},
		],
		children: [],
		timeline: [],
		...overrides,
	};
}

describe('BuilderCard', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
	});

	it('should render without throwing', () => {
		expect(() =>
			renderComponent({ props: { agentNode: makeCompletedBuilderNode() } }),
		).not.toThrow();
	});

	it('should show success result with workflow name', async () => {
		const { getByText } = renderComponent({
			props: { agentNode: makeCompletedBuilderNode() },
		});

		await waitFor(() => {
			expect(getByText('My Workflow')).toBeInTheDocument();
		});
	});

	describe('handleOpenWorkflow via inject', () => {
		it('should call injected openWorkflowPreview on normal click', async () => {
			const openPreviewMock = vi.fn();

			const { getByText } = renderComponent({
				props: { agentNode: makeCompletedBuilderNode() },
				global: {
					provide: {
						openWorkflowPreview: openPreviewMock,
					},
				},
			});

			await waitFor(() => {
				expect(getByText('Open workflow')).toBeInTheDocument();
			});

			await userEvent.click(getByText('Open workflow'));
			expect(openPreviewMock).toHaveBeenCalledWith('wf-1');
		});

		it('should open new tab on Ctrl+click', async () => {
			const openPreviewMock = vi.fn();
			const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

			const { getByText } = renderComponent({
				props: { agentNode: makeCompletedBuilderNode() },
				global: {
					provide: {
						openWorkflowPreview: openPreviewMock,
					},
				},
			});

			await waitFor(() => {
				expect(getByText('Open workflow')).toBeInTheDocument();
			});

			const openButton = getByText('Open workflow');
			openButton.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));

			expect(windowOpenSpy).toHaveBeenCalledWith('/workflow/wf-1', '_blank');
			expect(openPreviewMock).not.toHaveBeenCalled();

			windowOpenSpy.mockRestore();
		});
	});
});
