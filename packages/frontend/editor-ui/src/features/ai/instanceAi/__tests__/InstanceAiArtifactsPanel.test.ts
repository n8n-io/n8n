import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { TaskList } from '@n8n/api-types';
import type { ResourceEntry } from '../useResourceRegistry';
import InstanceAiArtifactsPanel from '../components/InstanceAiArtifactsPanel.vue';

const storeState = reactive({
	currentTasks: undefined as TaskList | undefined,
	producedArtifacts: new Map<string, ResourceEntry>(),
});

vi.mock('../instanceAi.store', () => ({
	useThread: vi.fn(() => storeState),
}));

const renderComponent = createComponentRenderer(InstanceAiArtifactsPanel, {
	global: {
		stubs: {
			ConnectionsCard: defineComponent({
				props: {
					dropdownPortalTarget: { type: HTMLElement, required: false },
				},
				setup(props) {
					return () =>
						h('section', {
							'data-test-id': 'connections-card',
							'data-portal-target-tag': props.dropdownPortalTarget?.tagName ?? '',
						});
				},
			}),
		},
	},
});

describe('InstanceAiArtifactsPanel', () => {
	beforeEach(() => {
		storeState.currentTasks = undefined;
		storeState.producedArtifacts = new Map<string, ResourceEntry>();
	});

	it('keeps empty artifacts and connections sections visible without an empty tasks section', () => {
		const { getByText, getByTestId, queryByText } = renderComponent();

		expect(getByTestId('instance-ai-artifacts-sidebar')).toBeInTheDocument();
		expect(getByTestId('instance-ai-artifacts-sidebar-group')).toBeInTheDocument();
		expect(getByTestId('instance-ai-artifacts-sidebar-pin')).toHaveAttribute(
			'aria-label',
			'Unpin panel',
		);
		expect(getByTestId('instance-ai-artifacts-sidebar-pin')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		expect(getByText('No artifacts yet')).toBeInTheDocument();
		expect(queryByText('To-do list')).not.toBeInTheDocument();
		expect(queryByText('No tasks yet')).not.toBeInTheDocument();
		expect(getByTestId('connections-card')).toBeInTheDocument();
	});

	it('anchors connection menus inside the panel', async () => {
		const { getByTestId } = renderComponent();

		await nextTick();

		expect(getByTestId('connections-card')).toHaveAttribute('data-portal-target-tag', 'ASIDE');
	});

	it('emits when the pin button is clicked and reflects the unpinned label', async () => {
		const { emitted, getByTestId } = renderComponent({ props: { isPinned: false } });
		const pinButton = getByTestId('instance-ai-artifacts-sidebar-pin');

		expect(pinButton).toHaveAttribute('aria-label', 'Pin panel');
		expect(pinButton).toHaveAttribute('aria-pressed', 'false');

		await fireEvent.click(pinButton);

		expect(emitted('togglePinned')).toHaveLength(1);
	});

	it('hides the pin button when pinning is unavailable', () => {
		const { queryByTestId } = renderComponent({ props: { isPinningAvailable: false } });

		expect(queryByTestId('instance-ai-artifacts-sidebar-pin')).not.toBeInTheDocument();
	});

	it('opens artifacts in preview and shows tasks without progress counts', async () => {
		const openWorkflowPreview = vi.fn();
		storeState.producedArtifacts = new Map<string, ResourceEntry>([
			[
				'wf-1',
				{
					type: 'workflow',
					id: 'wf-1',
					name: 'Sales follow-up workflow',
				},
			],
		]);
		storeState.currentTasks = {
			tasks: [
				{ id: 'task-1', description: 'Build the workflow', status: 'done' },
				{ id: 'task-2', description: 'Review the workflow', status: 'in_progress' },
			],
		};

		const { getByRole, getByText, queryByText } = renderComponent({
			global: {
				provide: {
					openWorkflowPreview,
				},
			},
		});

		const artifactLink = getByRole('link', { name: 'Open Sales follow-up workflow' });
		expect(artifactLink).toHaveAttribute('href', '/workflow/wf-1');
		expect(getByText('To-do list')).toBeInTheDocument();
		expect(getByText('Build the workflow')).toBeInTheDocument();
		expect(queryByText('1/2')).not.toBeInTheDocument();

		await fireEvent.click(artifactLink);

		expect(openWorkflowPreview).toHaveBeenCalledWith('wf-1');
	});
});
