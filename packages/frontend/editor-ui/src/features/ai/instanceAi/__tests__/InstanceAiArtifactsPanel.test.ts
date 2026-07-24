import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { IconBodyLoaderKey } from '@n8n/design-system';
import { defineComponent, h, nextTick, reactive, ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { TaskList } from '@n8n/api-types';
import type { ResourceEntry } from '../useResourceRegistry';
import InstanceAiArtifactsPanel from '../components/InstanceAiArtifactsPanel.vue';

const storeState = reactive({
	id: 'thread-1',
	currentTasks: undefined as TaskList | undefined,
	producedArtifacts: new Map<string, ResourceEntry>(),
	messages: [] as Array<{ role: string; context?: Record<string, unknown> }>,
	projectId: undefined as string | undefined,
});
const metadataState = ref<Record<string, unknown> | undefined>(undefined);
const updateThreadMetadataMock = vi.fn(
	async (_threadId: string, metadata: Record<string, unknown>) => {
		metadataState.value = { ...metadataState.value, ...metadata };
	},
);

vi.mock('../instanceAi.store', () => ({
	useThread: vi.fn(() => storeState),
	useInstanceAiStore: vi.fn(() => ({
		getThreadMetadata: vi.fn(() => metadataState.value),
		updateThreadMetadata: updateThreadMetadataMock,
	})),
}));

const renderComponent = createComponentRenderer(InstanceAiArtifactsPanel, {
	pinia: createTestingPinia(),
	global: {
		provide: {
			// Lucide-only icons (outside the curated set) need the async body loader.
			[IconBodyLoaderKey as symbol]: async () => '<path d="M1 1"/>',
		},
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
		storeState.projectId = 'proj-1';
		storeState.messages = [];
		metadataState.value = undefined;
		updateThreadMetadataMock.mockClear();
	});

	it('keeps empty artifacts and connections sections visible without an empty tasks section', () => {
		const { getByText, getByTestId, queryByText } = renderComponent();

		expect(getByTestId('instance-ai-artifacts-sidebar')).toBeInTheDocument();
		expect(getByTestId('instance-ai-artifacts-sidebar-group')).toBeInTheDocument();
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

	it('renders agent preview handoff context using the matching agent name', () => {
		storeState.producedArtifacts = new Map<string, ResourceEntry>([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]);
		storeState.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
				},
			},
		];

		const { getByText, getAllByTestId } = renderComponent();

		expect(getByText('Context')).toBeInTheDocument();
		expect(getByText('SEO Auditor session')).toBeInTheDocument();
		expect(getByText('Preview session')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-context-row')).toHaveLength(1);
	});

	it('renders agent preview handoff context as agent name + session title when carried', async () => {
		storeState.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
					agentName: 'SEO Auditor',
					// Lucide-only name outside the curated N8nIcon set — must still render.
					agentIcon: 'megaphone',
					sessionTitle: 'Help with tone',
				},
			},
		];

		const { getByText, container } = renderComponent();

		expect(getByText('SEO Auditor — Help with tone')).toBeInTheDocument();
		await waitFor(() => {
			expect(container.querySelector('[data-icon="megaphone"]')).toBeInTheDocument();
		});
	});

	it('renders agent preview handoff context as the session title when only it is carried', () => {
		storeState.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
					sessionTitle: 'Help with tone',
				},
			},
		];

		const { getByText } = renderComponent();

		expect(getByText('Help with tone')).toBeInTheDocument();
	});

	it('renders credential handoff context as credential setup', () => {
		storeState.messages = [
			{
				role: 'user',
				context: {
					source: 'credential-modal',
					credential: {
						credentialType: 'gmailOAuth2Api',
						displayName: 'Gmail OAuth2 API',
					},
				},
			},
		];

		const { getByText } = renderComponent();

		expect(getByText('Context')).toBeInTheDocument();
		expect(getByText('Gmail OAuth2 API')).toBeInTheDocument();
		expect(getByText('Credential setup')).toBeInTheDocument();
	});

	it('renders pending handoff context from the composer before any message is sent', () => {
		const pendingComposerContext = ref({
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			agentName: 'SEO Auditor',
		});

		const { getByText, getAllByTestId } = renderComponent({
			global: {
				provide: {
					pendingComposerContext,
				},
			},
		});

		expect(getByText('Context')).toBeInTheDocument();
		expect(getByText('SEO Auditor session')).toBeInTheDocument();
		expect(getByText('Preview session')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-context-row')).toHaveLength(1);
	});

	it('does not duplicate pending handoff context after it is also on a user message', () => {
		const pendingComposerContext = ref({
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			agentName: 'SEO Auditor',
		});
		storeState.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
					agentName: 'SEO Auditor',
				},
			},
		];

		const { getAllByTestId } = renderComponent({
			global: {
				provide: {
					pendingComposerContext,
				},
			},
		});

		expect(getAllByTestId('instance-ai-context-row')).toHaveLength(1);
	});

	it('clears pending handoff context on dismiss and persists the dismissed key', async () => {
		const pendingComposerContext = ref({
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			agentName: 'SEO Auditor',
		});

		const { getByTestId, queryByText } = renderComponent({
			global: {
				provide: {
					pendingComposerContext,
				},
			},
		});

		await fireEvent.click(getByTestId('instance-ai-context-dismiss'));

		expect(pendingComposerContext.value).toBeNull();
		expect(updateThreadMetadataMock).toHaveBeenCalledWith('thread-1', {
			dismissedContextKeys: ['agent-preview:agent-1:preview-thread-1:'],
		});
		expect(queryByText('SEO Auditor session')).not.toBeInTheDocument();
	});

	it('dismisses pending context that is also present on a user message', async () => {
		const pendingComposerContext = ref({
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			agentName: 'SEO Auditor',
		});
		storeState.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
					agentName: 'SEO Auditor',
				},
			},
		];

		const { getByTestId, queryByText } = renderComponent({
			global: {
				provide: {
					pendingComposerContext,
				},
			},
		});

		await fireEvent.click(getByTestId('instance-ai-context-dismiss'));

		expect(pendingComposerContext.value).toBeNull();
		expect(updateThreadMetadataMock).toHaveBeenCalledWith('thread-1', {
			dismissedContextKeys: ['agent-preview:agent-1:preview-thread-1:'],
		});
		expect(queryByText('SEO Auditor session')).not.toBeInTheDocument();
	});

	it('renders pending credential handoff context before any message is sent', () => {
		const pendingComposerContext = ref({
			source: 'credential-modal' as const,
			credential: {
				credentialType: 'gmailOAuth2Api',
				displayName: 'Gmail OAuth2 API',
			},
		});

		const { getByText } = renderComponent({
			global: {
				provide: {
					pendingComposerContext,
				},
			},
		});

		expect(getByText('Context')).toBeInTheDocument();
		expect(getByText('Gmail OAuth2 API')).toBeInTheDocument();
		expect(getByText('Credential setup')).toBeInTheDocument();
	});

	it('allows the user to dismiss a context entry', async () => {
		storeState.producedArtifacts = new Map<string, ResourceEntry>([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]);
		storeState.messages = [
			{
				role: 'user',
				context: {
					source: 'agent-preview',
					agentId: 'agent-1',
					threadId: 'preview-thread-1',
				},
			},
		];

		const { getByTestId, queryByText } = renderComponent();

		await fireEvent.click(getByTestId('instance-ai-context-dismiss'));

		expect(updateThreadMetadataMock).toHaveBeenCalledWith('thread-1', {
			dismissedContextKeys: ['agent-preview:agent-1:preview-thread-1:'],
		});
		expect(queryByText('SEO Auditor session')).not.toBeInTheDocument();
	});

	it('renders agent artifacts and opens them in the side panel', async () => {
		const openAgentPreview = vi.fn();
		storeState.producedArtifacts = new Map<string, ResourceEntry>([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]);

		const { getByRole } = renderComponent({
			global: {
				provide: {
					openAgentPreview,
				},
			},
		});

		const artifactLink = getByRole('link', { name: 'Open SEO Auditor' });
		expect(artifactLink).toHaveAttribute('href', '/projects/proj-1/agents/agent-1');
		expect(artifactLink.querySelector('[data-icon="robot"]')).toBeInTheDocument();

		const event = new MouseEvent('click', { bubbles: true, cancelable: true });
		const wasNotPrevented = artifactLink.dispatchEvent(event);

		expect(wasNotPrevented).toBe(false);
		expect(openAgentPreview).toHaveBeenCalledExactlyOnceWith('agent-1', 'proj-1');
	});

	it('leaves modified agent artifact clicks to the browser', () => {
		const openAgentPreview = vi.fn();
		storeState.producedArtifacts = new Map<string, ResourceEntry>([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'SEO Auditor',
				},
			],
		]);

		const { getByRole } = renderComponent({
			global: {
				provide: {
					openAgentPreview,
				},
			},
		});

		const artifactLink = getByRole('link', { name: 'Open SEO Auditor' });
		let wasDefaultPreventedByComponent: boolean | undefined;
		artifactLink.addEventListener('click', (event) => {
			wasDefaultPreventedByComponent = event.defaultPrevented;
			event.preventDefault();
		});
		const event = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
		artifactLink.dispatchEvent(event);

		expect(wasDefaultPreventedByComponent).toBe(false);
		expect(openAgentPreview).not.toHaveBeenCalled();
	});
});
