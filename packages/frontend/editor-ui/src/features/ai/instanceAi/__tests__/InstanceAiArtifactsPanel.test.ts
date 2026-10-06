import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { IconBodyLoaderKey } from '@n8n/design-system';
import { nextTick, reactive, ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import type {
	InstanceAiAgentNode,
	InstanceAiHandoffContext,
	InstanceAiToolCallState,
	TaskList,
} from '@n8n/api-types';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ResourceEntry } from '../useResourceRegistry';
import InstanceAiArtifactsPanel from '../components/InstanceAiArtifactsPanel.vue';

const storeState = reactive({
	id: 'thread-1',
	currentTasks: undefined as TaskList | undefined,
	producedArtifacts: new Map<string, ResourceEntry>(),
	messages: [] as Array<{
		role: string;
		context?: Record<string, unknown>;
		agentTree?: InstanceAiAgentNode;
	}>,
	projectId: undefined as string | undefined,
	hydrationStatus: 'ready' as 'idle' | 'hydrating' | 'ready',
	cancelBackgroundTask: vi.fn(async () => {}),
	sendTaskCorrection: vi.fn(async () => {}),
	resolvedConfirmationIds: new Map<string, string>(),
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
	},
});

describe('InstanceAiArtifactsPanel', () => {
	beforeEach(() => {
		storeState.currentTasks = undefined;
		storeState.producedArtifacts = new Map<string, ResourceEntry>();
		storeState.projectId = 'proj-1';
		storeState.hydrationStatus = 'ready';
		storeState.messages = [];
		metadataState.value = undefined;
		updateThreadMetadataMock.mockClear();
		useProjectsStore().myProjects = [];
	});

	it('shows the project name once the thread project is known', () => {
		useProjectsStore().myProjects = [
			{ id: 'proj-1', name: 'Marketing', type: 'team', icon: { type: 'icon', value: 'layers' } },
		] as ProjectListItem[];

		const { getByText, queryByText, queryByTestId } = renderComponent();

		expect(getByText('Marketing')).toBeInTheDocument();
		expect(queryByText('Unknown project')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-artifacts-project-loading')).not.toBeInTheDocument();
	});

	it('shows skeletons instead of "Unknown project" and "No artifacts yet" until hydration is ready', async () => {
		storeState.projectId = undefined;
		storeState.hydrationStatus = 'hydrating';

		const { getByTestId, queryByTestId, queryByText, getByText } = renderComponent();

		expect(getByTestId('instance-ai-artifacts-project-loading')).toBeInTheDocument();
		expect(getByTestId('instance-ai-artifacts-list-loading')).toBeInTheDocument();
		expect(queryByText('Unknown project')).not.toBeInTheDocument();
		expect(queryByText('No artifacts yet')).not.toBeInTheDocument();

		storeState.hydrationStatus = 'ready';
		await nextTick();

		expect(queryByTestId('instance-ai-artifacts-project-loading')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-artifacts-list-loading')).not.toBeInTheDocument();
		expect(getByText('Unknown project')).toBeInTheDocument();
		expect(getByText('No artifacts yet')).toBeInTheDocument();
	});

	it('keeps the empty artifacts section visible without an empty tasks section', () => {
		const { getByText, getByTestId, queryByText } = renderComponent();

		expect(getByTestId('instance-ai-artifacts-sidebar')).toBeInTheDocument();
		expect(getByTestId('instance-ai-artifacts-sidebar-group')).toBeInTheDocument();
		expect(getByText('No artifacts yet')).toBeInTheDocument();
		expect(queryByText('To-do list')).not.toBeInTheDocument();
		expect(queryByText('No tasks yet')).not.toBeInTheDocument();
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
						credentialType: 'gmailOAuth2',
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
		const pendingComposerContext = ref<InstanceAiHandoffContext | null>({
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

	it('asks the composer owner to clear a pending handoff on dismiss', async () => {
		const pendingComposerContext = ref<InstanceAiHandoffContext | null>({
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			agentName: 'SEO Auditor',
		});
		const dismissPendingComposerContext = vi.fn((key: string) => {
			pendingComposerContext.value = null;
			return key === 'agent-preview:agent-1:preview-thread-1:';
		});

		const { getByTestId, queryByText } = renderComponent({
			global: {
				provide: {
					pendingComposerContext,
					dismissPendingComposerContext,
				},
			},
		});

		await fireEvent.click(getByTestId('instance-ai-context-dismiss'));

		expect(pendingComposerContext.value).toBeNull();
		expect(dismissPendingComposerContext).toHaveBeenCalledWith(
			'agent-preview:agent-1:preview-thread-1:',
		);
		expect(updateThreadMetadataMock).not.toHaveBeenCalled();
		expect(queryByText('SEO Auditor session')).not.toBeInTheDocument();
	});

	it('keeps sent context visible when its pending copy is dismissed', async () => {
		const pendingComposerContext = ref<InstanceAiHandoffContext | null>({
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			agentName: 'SEO Auditor',
		});
		const dismissPendingComposerContext = vi.fn(() => {
			pendingComposerContext.value = null;
			return true;
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
					dismissPendingComposerContext,
				},
			},
		});

		await fireEvent.click(getByTestId('instance-ai-context-dismiss'));

		expect(pendingComposerContext.value).toBeNull();
		expect(dismissPendingComposerContext).toHaveBeenCalledWith(
			'agent-preview:agent-1:preview-thread-1:',
		);
		expect(updateThreadMetadataMock).not.toHaveBeenCalled();
		expect(queryByText('SEO Auditor session')).toBeInTheDocument();
	});

	it('does not partially dismiss pending context without its composer owner', async () => {
		const pendingComposerContext = ref<InstanceAiHandoffContext | null>({
			source: 'agent-preview',
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			agentName: 'SEO Auditor',
		});

		const { getByTestId, getByText } = renderComponent({
			global: {
				provide: {
					pendingComposerContext,
				},
			},
		});

		await fireEvent.click(getByTestId('instance-ai-context-dismiss'));

		expect(pendingComposerContext.value).not.toBeNull();
		expect(getByText('SEO Auditor session')).toBeInTheDocument();
		expect(updateThreadMetadataMock).not.toHaveBeenCalled();
	});

	it('renders pending credential handoff context before any message is sent', () => {
		const pendingComposerContext = ref({
			source: 'credential-modal' as const,
			credential: {
				credentialType: 'gmailOAuth2',
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

	it('shows a spinner on the artifact row while the AI is building it', () => {
		storeState.producedArtifacts = new Map<string, ResourceEntry>([
			['agent-1', { type: 'agent', id: 'agent-1', projectId: 'proj-1', name: 'SEO Auditor' }],
			['wf-1', { type: 'workflow', id: 'wf-1', name: 'My Workflow' }],
		]);
		storeState.messages = [
			{
				role: 'assistant',
				agentTree: {
					agentId: 'root',
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					timeline: [],
					children: [
						{
							agentId: 'builder-1',
							kind: 'agent-builder',
							role: 'agent-builder',
							status: 'active',
							textContent: '',
							reasoning: '',
							toolCalls: [],
							timeline: [],
							children: [],
							targetResource: { type: 'agent', id: 'agent-1' },
						},
					],
				} as InstanceAiAgentNode,
			},
		];

		const { getByRole } = renderComponent();

		const buildingRow = getByRole('link', { name: 'Open SEO Auditor' });
		expect(
			buildingRow.querySelector('[data-test-id="instance-ai-artifact-building-spinner"]'),
		).toBeInTheDocument();
		expect(buildingRow.querySelector('[data-icon="robot"]')).not.toBeInTheDocument();

		const idleRow = getByRole('link', { name: 'Open My Workflow' });
		expect(
			idleRow.querySelector('[data-test-id="instance-ai-artifact-building-spinner"]'),
		).not.toBeInTheDocument();
	});

	it('keeps pending agents in the preview without exposing a standalone link', () => {
		const openAgentPreview = vi.fn();
		storeState.producedArtifacts = new Map<string, ResourceEntry>([
			[
				'agent-1',
				{
					type: 'agent',
					id: 'agent-1',
					projectId: 'proj-1',
					name: 'New Agent',
					pending: true,
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

		const artifactLink = getByRole('link', { name: 'Open New Agent' });
		expect(artifactLink).toHaveAttribute('href', '#');

		const normalClick = new MouseEvent('click', { bubbles: true, cancelable: true });
		expect(artifactLink.dispatchEvent(normalClick)).toBe(false);
		expect(openAgentPreview).toHaveBeenCalledExactlyOnceWith('agent-1', 'proj-1');

		openAgentPreview.mockClear();
		let wasDefaultPreventedByComponent: boolean | undefined;
		artifactLink.addEventListener('click', (event) => {
			wasDefaultPreventedByComponent = event.defaultPrevented;
		});
		const modifiedClick = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			metaKey: true,
		});
		artifactLink.dispatchEvent(modifiedClick);

		expect(wasDefaultPreventedByComponent).toBe(true);
		expect(openAgentPreview).not.toHaveBeenCalled();
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

	describe('cloud browsers', () => {
		function browserAgent(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
			return {
				agentId: 'agent-browser-1',
				role: 'cloud-browser',
				taskId: 'browser-1',
				subtitle: 'Check my latest invoices',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
				...overrides,
			};
		}

		function withBrowserAgent(agent: InstanceAiAgentNode) {
			storeState.messages = [
				{
					role: 'assistant',
					agentTree: {
						...browserAgent(),
						agentId: 'root',
						role: 'orchestrator',
						children: [agent],
					},
				},
			];
		}

		it('hides the section when the thread has no browser sub-agent', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('instance-ai-cloud-browsers')).not.toBeInTheDocument();
		});

		it('keeps finished browser tasks with their result, without a stop button', () => {
			withBrowserAgent(
				browserAgent({ status: 'completed', result: 'Top tag is "love".\nMore detail here.' }),
			);

			const { getByTestId, queryByTestId } = renderComponent();

			expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent(
				'Top tag is "love".',
			);
			expect(queryByTestId('instance-ai-cloud-browser-stop')).not.toBeInTheDocument();
		});

		it('shows failed browser tasks and hides stopped ones', () => {
			storeState.messages = [
				{
					role: 'assistant',
					agentTree: {
						...browserAgent(),
						agentId: 'root',
						role: 'orchestrator',
						children: [
							browserAgent({ agentId: 'a1', status: 'error', error: 'Site blocked the browser' }),
							browserAgent({ agentId: 'a2', status: 'cancelled' }),
						],
					},
				},
			];

			const { getAllByTestId } = renderComponent();
			const statuses = getAllByTestId('instance-ai-cloud-browser-status').map((el) =>
				el.textContent?.trim(),
			);

			expect(statuses).toEqual(['Site blocked the browser']);
		});

		it('shows the reported outcome, not success, for a cleanly finished task', () => {
			storeState.messages = [
				{
					role: 'assistant',
					agentTree: {
						...browserAgent(),
						agentId: 'root',
						role: 'orchestrator',
						children: [
							browserAgent({ agentId: 'a1', status: 'completed', outcome: 'denied', result: '' }),
							browserAgent({ agentId: 'a2', status: 'completed', outcome: 'blocked', result: '' }),
						],
					},
				},
			];

			const { getAllByTestId } = renderComponent();
			const statuses = getAllByTestId('instance-ai-cloud-browser-status').map((el) =>
				el.textContent?.trim(),
			);

			expect(statuses).toEqual(expect.arrayContaining(['Denied', 'Blocked by the site']));
		});

		it('shows a running browser and stops it', async () => {
			withBrowserAgent(browserAgent());

			const { getByText, getByTestId, queryByTestId } = renderComponent();

			expect(getByText('Check my latest invoices')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-cloud-browser-live-view')).not.toBeInTheDocument();

			await fireEvent.click(getByTestId('instance-ai-cloud-browser-stop'));
			expect(storeState.cancelBackgroundTask).toHaveBeenCalledWith('browser-1');
		});

		it('links to the Live View while the browser waits for the user', () => {
			withBrowserAgent(
				browserAgent({
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'request-user-action',
							args: { liveViewUrl: 'https://live.example/abc', reason: 'Sign in to Stripe' },
							isLoading: true,
						},
					],
				}),
			);

			const { getByTestId } = renderComponent();

			expect(getByTestId('instance-ai-cloud-browser-live-view')).toHaveAttribute(
				'href',
				'https://live.example/abc',
			);
		});

		it('shows when the browser task waits for an approval, and keeps it stoppable', () => {
			withBrowserAgent(
				browserAgent({
					toolCalls: [
						{
							toolCallId: 'tc-cred',
							toolName: 'browser_create_credential',
							args: {},
							isLoading: true,
							confirmation: { requestId: 'req-1' } as InstanceAiToolCallState['confirmation'],
						},
					],
				}),
			);

			const { getByTestId } = renderComponent();

			expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent(
				'Waiting for your approval',
			);
			expect(getByTestId('instance-ai-cloud-browser-stop')).toBeInTheDocument();
		});

		it('stops waiting for the approval as soon as the user answers it', () => {
			withBrowserAgent(
				browserAgent({
					toolCalls: [
						{
							toolCallId: 'tc-nav',
							toolName: 'browser_navigate',
							args: {},
							// The tool still runs: the browser starts after the approval.
							isLoading: true,
							confirmation: { requestId: 'req-1' } as InstanceAiToolCallState['confirmation'],
						},
					],
				}),
			);
			storeState.resolvedConfirmationIds.set('req-1', 'approved');

			const { getByTestId } = renderComponent();

			expect(getByTestId('instance-ai-cloud-browser-status')).not.toHaveTextContent(
				'Waiting for your approval',
			);
			storeState.resolvedConfirmationIds.clear();
		});

		it('shows the browser starting once the backend reports the approval answered', () => {
			withBrowserAgent(
				browserAgent({
					toolCalls: [
						{
							toolCallId: 'tc-nav',
							toolName: 'browser_start_session',
							args: {},
							isLoading: true,
							confirmation: { requestId: 'req-2' } as InstanceAiToolCallState['confirmation'],
						},
						{
							toolCallId: 'state-1',
							toolName: 'cloud-browser-state',
							args: { answeredApproval: 'req-2' },
							isLoading: false,
						},
						{
							toolCallId: 'state-2',
							toolName: 'cloud-browser-state',
							args: { phase: 'starting' },
							isLoading: false,
						},
					],
				}),
			);

			const { getByTestId } = renderComponent();

			expect(getByTestId('instance-ai-cloud-browser-status')).toHaveTextContent(
				'Starting the browser',
			);
		});

		it('shows what the browser is doing, and what it waits for', () => {
			storeState.messages = [
				{
					role: 'assistant',
					agentTree: {
						...browserAgent(),
						agentId: 'root',
						role: 'orchestrator',
						children: [
							browserAgent({
								agentId: 'a1',
								toolCalls: [
									{
										toolCallId: 'state-1',
										toolName: 'cloud-browser-state',
										args: { status: 'Looking up invoices', liveViewUrl: 'https://live.example/s' },
										isLoading: false,
									},
								],
							}),
							browserAgent({
								agentId: 'a2',
								toolCalls: [
									{
										toolCallId: 'tc-1',
										toolName: 'request-user-action',
										args: {
											liveViewUrl: 'https://live.example/abc',
											reason: 'Sign in to Ledgerly',
										},
										isLoading: true,
									},
								],
							}),
						],
					},
				},
			];

			const { getAllByTestId } = renderComponent();
			const statuses = getAllByTestId('instance-ai-cloud-browser-status').map((el) =>
				el.textContent?.trim(),
			);

			expect(statuses).toEqual(
				expect.arrayContaining(['Looking up invoices', 'Waiting for you: Sign in to Ledgerly']),
			);
		});

		it('opens the browser tab from the preview when the thread view offers one', async () => {
			withBrowserAgent(
				browserAgent({
					toolCalls: [
						{
							toolCallId: 'state-1',
							toolName: 'cloud-browser-state',
							args: { liveViewUrl: 'https://live.example/s' },
							isLoading: false,
						},
					],
				}),
			);
			const openCloudBrowserTab = vi.fn(() => true);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						[IconBodyLoaderKey as symbol]: async () => '<path d="M1 1"/>',
						openCloudBrowserTab,
					},
				},
			});
			await fireEvent.click(getByTestId('instance-ai-cloud-browser-live-view'));

			expect(openCloudBrowserTab).toHaveBeenCalledWith('agent-browser-1');
		});
	});
});
