import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { TabsRoot } from 'reka-ui';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import type { ArtifactTab } from '../useCanvasPreview';

vi.mock('@/app/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn() }),
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

// TabsList/Trigger rely on reka-ui's Tabs context, so the harness wraps the
// bar in a TabsRoot. We also forward `activeTabId` through to the component
// so the scroll-into-view watcher is actually exercised.
const Wrapper = defineComponent({
	props: {
		tabs: { type: Array as () => ArtifactTab[], required: true },
		activeTabId: { type: String, default: undefined },
		isExpanded: { type: Boolean, default: false },
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
					previewToggleLabel: props.previewToggleLabel,
					onTogglePreview: () => emit('togglePreview'),
					onToggleExpanded: () => emit('toggleExpanded'),
				}),
			);
	},
});

const renderComponent = createComponentRenderer(Wrapper);

describe('InstanceAiPreviewTabBar', () => {
	it('renders a trigger with data-tab-id for each tab', () => {
		const { container } = renderComponent({
			props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
		});

		expect(container.querySelector('[data-tab-id="wf-1"]')).not.toBeNull();
		expect(container.querySelector('[data-tab-id="dt-1"]')).not.toBeNull();
	});

	it('renders tab labels from props', () => {
		const { getByText } = renderComponent({
			props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
		});

		expect(getByText('My Workflow')).toBeInTheDocument();
		expect(getByText('My Table')).toBeInTheDocument();
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
});
