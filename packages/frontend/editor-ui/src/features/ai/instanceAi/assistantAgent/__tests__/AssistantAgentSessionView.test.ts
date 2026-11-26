import { UNLIMITED_CREDITS, type SystemAgentThreadSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent } from 'vue';

import type { ThreadDetail } from '@/features/agents/composables/useAgentThreadsApi';
import type { SessionTimelineMetadata } from '@/features/agents/types';
import { createComponentRenderer } from '@/__tests__/render';

import { useAssistantCreditsStore } from '../../assistantCredits.store';
import { ASSISTANT_AGENT_ID } from '../assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgentThreads.store';
import AssistantAgentSessionView from '../AssistantAgentSessionView.vue';

const { getSystemAgentThread, headerProps, panel } = vi.hoisted(() => ({
	getSystemAgentThread: vi.fn(),
	headerProps: { current: {} as { metadata?: SessionTimelineMetadata } },
	panel: {
		props: undefined as Record<string, unknown> | undefined,
		emitLoaded: undefined as ((detail: unknown) => void) | undefined,
	},
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
		resolve: () => ({ href: '/assistant/thread-1' }),
		back: vi.fn(),
	}),
	useRoute: () => ({ params: {}, query: {} }),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({ getSystemAgentThread }));
vi.mock('@/features/agents/composables/useAgentExecutionUpdates', () => ({
	useAgentExecutionUpdates: vi.fn(),
}));

vi.mock('@/features/agents/components/AgentSessionTimelineHeader.vue', () => ({
	default: defineComponent({
		name: 'AgentSessionTimelineHeader',
		props: ['metadata'],
		setup(props) {
			headerProps.current = props;
			return () => null;
		},
	}),
}));

vi.mock('@/features/agents/components/AgentSessionTimelinePanel.vue', () => ({
	default: defineComponent({
		name: 'AgentSessionTimelinePanel',
		props: ['projectId', 'agentId', 'threadId', 'agentName', 'channel'],
		emits: ['loaded'],
		setup(props, { emit }) {
			panel.props = props;
			panel.emitLoaded = (detail) => emit('loaded', detail);
			return () => null;
		},
	}),
}));

const summary = {
	id: 'thread-1',
	projectId: 'project-1',
	title: 'Build a workflow',
	updatedAt: '2026-11-23T10:00:00.000Z',
} as SystemAgentThreadSummary;

const detail = {
	thread: {
		id: 'thread-1',
		agentName: 'n8n Assistant',
		totalPromptTokens: 900,
		totalCompletionTokens: 100,
		totalCost: 0.25,
		totalDuration: 1500,
	},
	executions: [],
} as unknown as ThreadDetail;

const renderView = createComponentRenderer(AssistantAgentSessionView, {
	props: { threadId: 'thread-1' },
});

function setUp(options: { quota?: number; creditsUsed?: number; creditsLoad?: boolean }) {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const threadsStore = useAssistantAgentThreadsStore();
	vi.mocked(threadsStore.loadThreadCredits).mockResolvedValue(options.creditsLoad ?? true);
	vi.mocked(threadsStore.threadCreditsUsed).mockReturnValue(options.creditsUsed);
	useAssistantCreditsStore().creditsQuota = options.quota;
	return pinia;
}

async function renderLoaded(pinia: ReturnType<typeof createTestingPinia>) {
	renderView({ pinia });
	await flushPromises();
	panel.emitLoaded?.(detail);
	await flushPromises();
	return headerProps.current.metadata;
}

describe('AssistantAgentSessionView', () => {
	beforeEach(() => {
		getSystemAgentThread.mockResolvedValue(summary);
		panel.props = undefined;
		headerProps.current = {};
	});

	it('loads the timeline of the thread from its project on the system channel', async () => {
		renderView({ pinia: setUp({ quota: UNLIMITED_CREDITS }) });
		await flushPromises();

		expect(getSystemAgentThread).toHaveBeenCalledWith(
			expect.anything(),
			ASSISTANT_AGENT_ID,
			'thread-1',
		);
		expect(panel.props).toMatchObject({
			projectId: 'project-1',
			agentId: ASSISTANT_AGENT_ID,
			threadId: 'thread-1',
			channel: 'system',
		});
	});

	it('shows the dollar cost when the instance uses its own model key', async () => {
		const metadata = await renderLoaded(setUp({ quota: UNLIMITED_CREDITS }));

		expect(metadata).toMatchObject({ totalTokens: 1000, totalCost: 0.25 });
		expect(metadata?.totalCredits).toBeUndefined();
	});

	it('shows the credits of the thread instead of the cost on a credit instance', async () => {
		const metadata = await renderLoaded(setUp({ quota: 100, creditsUsed: 3.5 }));

		expect(metadata).toMatchObject({ totalCredits: 3.5, totalCost: null });
	});

	it('shows zero credits once the load finds no credit total', async () => {
		const metadata = await renderLoaded(setUp({ quota: 100 }));

		expect(metadata).toMatchObject({ totalCredits: 0, totalCost: null });
	});

	it('shows neither credits nor cost until the credit quota loads', async () => {
		const metadata = await renderLoaded(setUp({}));

		expect(metadata?.totalCredits).toBeUndefined();
		expect(metadata?.totalCost).toBeNull();
	});

	it('shows neither credits nor cost when the credit total fails to load', async () => {
		const metadata = await renderLoaded(setUp({ quota: 100, creditsLoad: false }));

		expect(metadata?.totalCredits).toBeUndefined();
		expect(metadata?.totalCost).toBeNull();
	});
});
