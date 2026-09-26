import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { TabsRoot } from 'reka-ui';
import { readFileSync } from 'node:fs';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import type { ArtifactTab } from '../useCanvasPreview';
import { HOVER_DELAY } from '@/app/constants/durations';

const mockCopy = vi.fn();
const mockShowMessage = vi.fn();
const mockSearchWorkflows = vi.hoisted(() => vi.fn());
const mockFetchDataTablesApi = vi.hoisted(() => vi.fn());
const mockListAgentsPage = vi.hoisted(() => vi.fn());

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPage: mockListAgentsPage,
}));

vi.mock('@/features/core/dataTable/dataTable.api', () => ({
	fetchDataTablesApi: mockFetchDataTablesApi,
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows: mockSearchWorkflows }),
}));

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: mockCopy }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mockShowMessage }),
}));

const workflowTab: ArtifactTab = {
	id: 'wf-1',
	type: 'workflow',
	name: 'My Workflow',
	icon: 'workflow',
};

const dataTableTab: ArtifactTab = {
	id: 'dt-1',
	type: 'data-table',
	name: 'My Table',
	icon: 'table',
	projectId: 'proj-1',
};

const agentTab: ArtifactTab = {
	id: 'agent-1',
	type: 'agent',
	name: 'SEO Auditor',
	icon: 'robot',
	projectId: 'proj-1',
};

const agentTabWithoutProject: ArtifactTab = {
	id: 'agent-2',
	type: 'agent',
	name: 'Standalone Agent',
	icon: 'robot',
};

// TabsList/Trigger rely on reka-ui's Tabs context, so the harness wraps the
// bar in a TabsRoot. We also forward `activeTabId` through to the component
// so the scroll-into-view watcher is actually exercised.
const Wrapper = defineComponent({
	props: {
		tabs: { type: Array as () => ArtifactTab[], required: true },
		activeTabId: { type: String, default: undefined },
		isExpanded: { type: Boolean, default: false },
		isExpandDisabled: { type: Boolean, default: false },
		previewToggleLabel: { type: String, default: undefined },
		projectId: { type: String, default: undefined },
	},
	emits: ['togglePreview', 'toggleExpanded', 'closeTab', 'openTab'],
	setup(props, { emit }) {
		return () =>
			h(TabsRoot, { modelValue: props.activeTabId }, () =>
				h(InstanceAiPreviewTabBar, {
					tabs: props.tabs,
					activeTabId: props.activeTabId,
					isExpanded: props.isExpanded,
					isExpandDisabled: props.isExpandDisabled,
					previewToggleLabel: props.previewToggleLabel,
					projectId: props.projectId,
					onTogglePreview: () => emit('togglePreview'),
					onCloseTab: (tabId: string) => emit('closeTab', tabId),
					onOpenTab: (tab: ArtifactTab) => emit('openTab', tab),
					onToggleExpanded: () => emit('toggleExpanded'),
				}),
			);
	},
});

// Experiment cleanup: remove with openWorkflowInAssistant.
const renderComponent = createComponentRenderer(Wrapper, { pinia: createTestingPinia() });

async function openAgentTabContextMenu(container: Element, tabId = 'agent-1') {
	const agentTabTrigger = container.querySelector<HTMLElement>(`[data-tab-id="${tabId}"]`);
	expect(agentTabTrigger).not.toBeNull();
	await fireEvent.contextMenu(agentTabTrigger!);
}

async function selectContextMenuItem(label: string) {
	let menuItem: HTMLElement | null = null;
	await waitFor(() => {
		menuItem =
			[...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) =>
				item.textContent?.includes(label),
			) ?? null;
		expect(menuItem).not.toBeNull();
	});
	await fireEvent.click(menuItem!);
}

describe('InstanceAiPreviewTabBar', () => {
	beforeEach(() => {
		mockCopy.mockReset();
		mockShowMessage.mockReset();
		mockCopy.mockResolvedValue(undefined);
		mockSearchWorkflows.mockReset();
		mockSearchWorkflows.mockResolvedValue([]);
		mockFetchDataTablesApi.mockReset();
		mockFetchDataTablesApi.mockResolvedValue({ count: 0, data: [] });
		mockListAgentsPage.mockReset();
		mockListAgentsPage.mockResolvedValue({ count: 0, data: [] });
		vi.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders a trigger with data-tab-id for each tab', () => {
		const { container } = renderComponent({
			props: { tabs: [workflowTab, dataTableTab, agentTab], activeTabId: 'wf-1' },
		});

		expect(container.querySelector('[data-tab-id="wf-1"]')).not.toBeNull();
		expect(container.querySelector('[data-tab-id="dt-1"]')).not.toBeNull();
		expect(container.querySelector('[data-tab-id="agent-1"]')).not.toBeNull();
	});

	it('renders tab labels from props', () => {
		const { getByText } = renderComponent({
			props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
		});

		expect(getByText('My Workflow')).toBeInTheDocument();
		expect(getByText('My Table')).toBeInTheDocument();
	});

	it('shows a spinner instead of the artifact icon while the AI is building the artifact', () => {
		const { container } = renderComponent({
			props: {
				tabs: [{ ...agentTab, building: true }, workflowTab],
				activeTabId: 'agent-1',
			},
		});

		const buildingTab = container.querySelector('[data-tab-id="agent-1"]');
		const idleTab = container.querySelector('[data-tab-id="wf-1"]');

		expect(
			buildingTab?.querySelector('[data-test-id="instance-ai-tab-building-spinner"]'),
		).not.toBeNull();
		expect(idleTab?.querySelector('[data-test-id="instance-ai-tab-building-spinner"]')).toBeNull();
	});

	it('marks the active tab with data-state=active', () => {
		const { container } = renderComponent({
			props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
		});

		const active = container.querySelector('[data-tab-id="wf-1"]');
		const inactive = container.querySelector('[data-tab-id="dt-1"]');

		expect(active?.getAttribute('data-state')).toBe('active');
		expect(inactive?.getAttribute('data-state')).toBe('inactive');
	});

	it('emits toggleExpanded when the expand button is clicked', async () => {
		const { container, emitted } = renderComponent({
			props: { tabs: [workflowTab], activeTabId: 'wf-1' },
		});

		const expandButton = container.querySelector<HTMLButtonElement>(
			'[data-test-id="instance-ai-preview-expand-toggle"]',
		);
		expect(expandButton).not.toBeNull();
		expect(expandButton).toHaveAttribute('aria-label', 'Expand panel');
		await fireEvent.click(expandButton!);

		expect(emitted().toggleExpanded).toBeTruthy();
	});

	describe('closing tabs', () => {
		it('emits closeTab when the close button of a tab is clicked', async () => {
			const { container, emitted } = renderComponent({
				props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
			});

			const item = container.querySelector('[data-tab-item-id="dt-1"]');
			const closeButton = item?.querySelector<HTMLElement>(
				'[data-test-id="instance-ai-tab-close"]',
			);
			expect(closeButton).toHaveAttribute('aria-label', 'Close My Table');
			await fireEvent.click(closeButton!);

			expect(emitted().closeTab).toEqual([['dt-1']]);
		});

		it('emits closeTab when a tab is clicked with the middle mouse button', async () => {
			const { container, emitted } = renderComponent({
				props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
			});

			const item = container.querySelector<HTMLElement>('[data-tab-item-id="wf-1"]');
			await fireEvent(item!, new MouseEvent('auxclick', { bubbles: true, button: 1 }));

			expect(emitted().closeTab).toEqual([['wf-1']]);
		});

		it('emits closeTab when Delete is pressed on a focused tab', async () => {
			const { container, emitted } = renderComponent({
				props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
			});

			const trigger = container.querySelector<HTMLElement>('[data-tab-id="wf-1"]');
			await fireEvent.keyDown(trigger!, { key: 'Delete' });

			expect(emitted().closeTab).toEqual([['wf-1']]);
		});
	});

	describe('new tab picker', () => {
		it('hides the new tab button when the thread has no project', () => {
			const { queryByTestId } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			expect(queryByTestId('instance-ai-new-tab-button')).toBeNull();
		});

		it('lists the resources of the project that are not open, and opens the picked one', async () => {
			mockSearchWorkflows.mockResolvedValue([
				{ id: 'wf-1', name: 'My Workflow', updatedAt: '2026-09-24T10:00:00.000Z' },
				{ id: 'wf-2', name: 'Other Workflow', updatedAt: '2026-09-23T10:00:00.000Z' },
			]);
			mockListAgentsPage.mockResolvedValue({
				count: 1,
				data: [{ id: 'agent-9', name: 'Picked Agent', updatedAt: '2026-09-22T10:00:00.000Z' }],
			});
			const { getByTestId, emitted } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1', projectId: 'proj-1' },
			});

			await userEvent.click(getByTestId('instance-ai-new-tab-button'));

			let items: HTMLElement[] = [];
			await waitFor(() => {
				items = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
				expect(items.map((item) => item.textContent?.trim())).toEqual([
					'Other Workflow',
					'Picked Agent',
				]);
			});
			expect(mockSearchWorkflows).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'proj-1' }),
			);

			await userEvent.click(items[1]);

			expect(emitted().openTab).toEqual([
				[
					{
						type: 'agent',
						id: 'agent-9',
						name: 'Picked Agent',
						icon: 'robot',
						projectId: 'proj-1',
					},
				],
			]);
		});
	});

	it('emits togglePreview when the preview toggle is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				tabs: [workflowTab],
				activeTabId: 'wf-1',
				previewToggleLabel: 'Hide artifacts preview',
			},
		});

		const toggleButton = getByTestId('instance-ai-artifacts-preview-toggle');
		expect(toggleButton).toHaveAttribute('aria-label', 'Hide artifacts preview');
		expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

		await fireEvent.click(toggleButton);

		expect(emitted().togglePreview).toBeTruthy();
	});

	it('labels the size toggle as collapse when the panel is expanded', () => {
		const { container } = renderComponent({
			props: { tabs: [workflowTab], activeTabId: 'wf-1', isExpanded: true },
		});

		const collapseButton = container.querySelector<HTMLButtonElement>(
			'[data-test-id="instance-ai-preview-expand-toggle"]',
		);

		expect(collapseButton).not.toBeNull();
		expect(collapseButton).toHaveAttribute('aria-label', 'Collapse panel');
	});

	it('disables the size toggle when the host layout controls panel width', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { tabs: [workflowTab], activeTabId: 'wf-1', isExpandDisabled: true },
		});
		const expandToggle = getByTestId('instance-ai-preview-expand-toggle');

		expect(expandToggle).toBeDisabled();
		expect(expandToggle).not.toHaveAttribute('title');
		await fireEvent.click(expandToggle);
		expect(emitted().toggleExpanded).toBeUndefined();
	});

	it('does not fade the left edge of artifact tabs', () => {
		const source = readFileSync(
			'src/features/ai/instanceAi/components/InstanceAiPreviewTabBar.vue',
			'utf8',
		);

		expect(source).not.toContain('--left--fade');
	});

	describe('agent artifact context menu', () => {
		it('opens the agent in the editor from the context menu', async () => {
			const { container } = renderComponent({
				props: { tabs: [agentTab], activeTabId: 'agent-1' },
			});

			await openAgentTabContextMenu(container);
			await selectContextMenuItem('Open in editor');

			expect(window.open).toHaveBeenCalledWith(
				'/projects/proj-1/agents/agent-1',
				'_blank',
				'noopener',
			);
		});

		it('copies the agent link from the context menu', async () => {
			const { container } = renderComponent({
				props: { tabs: [agentTab], activeTabId: 'agent-1' },
			});

			await openAgentTabContextMenu(container);
			await selectContextMenuItem('Copy link');

			await waitFor(() => {
				expect(mockCopy).toHaveBeenCalledWith(
					`${window.location.origin}/projects/proj-1/agents/agent-1`,
				);
			});
			expect(mockShowMessage).toHaveBeenCalledWith({
				title: 'Copied to clipboard',
				type: 'success',
			});
		});

		it('falls back to the agents home route when the agent has no project', async () => {
			const { container } = renderComponent({
				props: { tabs: [agentTabWithoutProject], activeTabId: 'agent-2' },
			});

			await openAgentTabContextMenu(container, 'agent-2');
			await selectContextMenuItem('Open in editor');

			expect(window.open).toHaveBeenCalledWith('/home/agents', '_blank', 'noopener');
		});
	});
	describe('tab hover card', () => {
		const workflowTab2: ArtifactTab = { ...workflowTab, id: 'wf-2', name: 'Second Workflow' };

		function getHoverCard() {
			return document.body.querySelector<HTMLElement>(
				'[data-test-id="instance-ai-tab-hover-card"]',
			);
		}

		// The hover handlers sit on the tab item that wraps the trigger and the close button.
		function getTabItem(container: Element, tabId: string) {
			const item = container.querySelector<HTMLElement>(`[data-tab-item-id="${tabId}"]`);
			expect(item).not.toBeNull();
			return item!;
		}

		async function hoverTab(container: Element, tabId: string) {
			await fireEvent.mouseEnter(getTabItem(container, tabId));
			await vi.advanceTimersByTimeAsync(HOVER_DELAY.SHOW);
		}

		beforeEach(() => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('opens only after the hover delay', async () => {
			const { container } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			await fireEvent.mouseEnter(getTabItem(container, 'wf-1'));
			await vi.advanceTimersByTimeAsync(HOVER_DELAY.SHOW - 1);
			expect(getHoverCard()).toBeNull();

			await vi.advanceTimersByTimeAsync(1);
			expect(getHoverCard()).toHaveTextContent('My Workflow');
		});

		it('does not open when the pointer leaves before the delay ends', async () => {
			const { container } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			const trigger = getTabItem(container, 'wf-1');
			await fireEvent.mouseEnter(trigger);
			await fireEvent.mouseLeave(trigger);
			await vi.advanceTimersByTimeAsync(HOVER_DELAY.SHOW);

			expect(getHoverCard()).toBeNull();
		});

		it('shows the edited time and published status of a workflow', async () => {
			mockSearchWorkflows.mockResolvedValue([
				{
					id: 'wf-1',
					name: 'My Workflow',
					updatedAt: new Date().toISOString(),
					activeVersionId: 'v1',
				},
			]);
			const { container } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			await hoverTab(container, 'wf-1');

			expect(getHoverCard()).toHaveTextContent('Edited');
			expect(
				document.body.querySelector('[data-test-id="instance-ai-tab-hover-card-status"]'),
			).toHaveTextContent('Published');
		});

		it('shows the draft status of an unpublished workflow', async () => {
			mockSearchWorkflows.mockResolvedValue([
				{
					id: 'wf-1',
					name: 'My Workflow',
					updatedAt: new Date().toISOString(),
					activeVersionId: null,
				},
			]);
			const { container } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			await hoverTab(container, 'wf-1');

			expect(
				document.body.querySelector('[data-test-id="instance-ai-tab-hover-card-status"]'),
			).toHaveTextContent('Draft');
		});

		it('shows placeholders until the workflow details load', async () => {
			mockSearchWorkflows.mockReturnValue(new Promise(() => {}));
			const { container } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			await hoverTab(container, 'wf-1');

			expect(
				document.body.querySelector('[data-test-id="instance-ai-tab-hover-card-placeholder"]'),
			).not.toBeNull();
			expect(
				document.body.querySelector('[data-test-id="instance-ai-tab-hover-card-status"]'),
			).toBeNull();
		});

		it('shows the edited time and column count of a data table', async () => {
			mockFetchDataTablesApi.mockResolvedValue({
				count: 1,
				data: [
					{
						id: 'dt-1',
						name: 'My Table',
						updatedAt: new Date().toISOString(),
						columns: [{ id: 'col-1' }, { id: 'col-2' }],
					},
				],
			});
			const { container } = renderComponent({
				props: { tabs: [dataTableTab], activeTabId: 'dt-1' },
			});

			await hoverTab(container, 'dt-1');

			expect(getHoverCard()).toHaveTextContent('Edited');
			expect(
				document.body.querySelector('[data-test-id="instance-ai-tab-hover-card-status"]'),
			).toHaveTextContent('3 columns');
			expect(mockSearchWorkflows).not.toHaveBeenCalled();
		});

		it('shows only the name for an agent tab', async () => {
			const { container } = renderComponent({
				props: { tabs: [agentTab], activeTabId: 'agent-1' },
			});

			await hoverTab(container, 'agent-1');

			expect(getHoverCard()).toHaveTextContent('SEO Auditor');
			expect(
				document.body.querySelector('[data-test-id="instance-ai-tab-hover-card-placeholder"]'),
			).toBeNull();
			expect(
				document.body.querySelector('[data-test-id="instance-ai-tab-hover-card-status"]'),
			).toBeNull();
		});

		it('moves an open card to the next hovered tab without the delay', async () => {
			const { container } = renderComponent({
				props: { tabs: [workflowTab, workflowTab2], activeTabId: 'wf-1' },
			});

			await hoverTab(container, 'wf-1');
			await fireEvent.mouseLeave(getTabItem(container, 'wf-1'));
			await fireEvent.mouseEnter(getTabItem(container, 'wf-2'));

			expect(getHoverCard()).toHaveTextContent('Second Workflow');
		});

		it('shows the new name when the hovered tab is renamed', async () => {
			const { container, rerender } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			await hoverTab(container, 'wf-1');
			await rerender({ tabs: [{ ...workflowTab, name: 'Renamed Workflow' }], activeTabId: 'wf-1' });

			expect(getHoverCard()).toHaveTextContent('Renamed Workflow');
		});

		it('closes when the hovered tab is removed', async () => {
			const { container, rerender } = renderComponent({
				props: { tabs: [workflowTab, workflowTab2], activeTabId: 'wf-2' },
			});

			await hoverTab(container, 'wf-1');
			await rerender({ tabs: [workflowTab2], activeTabId: 'wf-2' });

			expect(getHoverCard()).toBeNull();
		});

		it('does not open when the tab is removed during the hover delay', async () => {
			const { container, rerender } = renderComponent({
				props: { tabs: [workflowTab, workflowTab2], activeTabId: 'wf-2' },
			});

			await fireEvent.mouseEnter(getTabItem(container, 'wf-1'));
			await rerender({ tabs: [workflowTab2], activeTabId: 'wf-2' });
			await vi.advanceTimersByTimeAsync(HOVER_DELAY.SHOW);

			expect(getHoverCard()).toBeNull();
		});

		it('closes after the pointer leaves the tabs', async () => {
			const { container } = renderComponent({
				props: { tabs: [workflowTab], activeTabId: 'wf-1' },
			});

			await hoverTab(container, 'wf-1');
			await fireEvent.mouseLeave(getTabItem(container, 'wf-1'));
			await vi.advanceTimersByTimeAsync(HOVER_DELAY.LEAVE);

			expect(getHoverCard()).toBeNull();
		});
	});
});
