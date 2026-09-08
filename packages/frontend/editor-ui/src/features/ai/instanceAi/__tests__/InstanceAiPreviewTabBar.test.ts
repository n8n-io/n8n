import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { TabsRoot } from 'reka-ui';
import { readFileSync } from 'node:fs';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import type { ArtifactTab } from '../useCanvasPreview';

const mockCopy = vi.fn();
const mockShowMessage = vi.fn();

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
	},
	emits: ['togglePreview', 'toggleExpanded'],
	setup(props, { emit }) {
		return () =>
			h(TabsRoot, { modelValue: props.activeTabId }, () =>
				h(InstanceAiPreviewTabBar, {
					tabs: props.tabs,
					activeTabId: props.activeTabId,
					isExpanded: props.isExpanded,
					isExpandDisabled: props.isExpandDisabled,
					previewToggleLabel: props.previewToggleLabel,
					onTogglePreview: () => emit('togglePreview'),
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
});
