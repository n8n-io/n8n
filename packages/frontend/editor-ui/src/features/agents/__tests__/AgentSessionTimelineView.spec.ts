/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { N8nEmptyState } from '@n8n/design-system';
import type * as AgentBuilderSessionModule from '@/features/agents/composables/useAgentBuilderSession';
import AgentSessionTimelineView from '../views/AgentSessionTimelineView.vue';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import AgentSessionTimelineHeader from '../components/AgentSessionTimelineHeader.vue';
import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import {
	AGENT_BUILDER_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	EXECUTIONS_SECTION_KEY,
} from '../constants';

interface SessionThread {
	id: string;
	projectId: string;
	agentId: string;
	canContinueInPreview: boolean;
	updatedAt: string;
	title?: string;
}

const privateThread = (id: string): SessionThread => ({
	id,
	projectId: 'p1',
	agentId: 'a1',
	canContinueInPreview: true,
	updatedAt: '2026-01-01T00:00:00.000Z',
});

const routeParams = reactive({ projectId: 'p1', agentId: 'a1', threadId: 'thread-a' });
const routerPush = vi.fn();
const routerReplace = vi.fn();
const sessionThreads = reactive<SessionThread[]>([]);
const previewSessionThreads = reactive<SessionThread[]>([]);
const pushListeners = new Set<(event: PushMessage) => void>();
const agentPermissions = vi.hoisted(() => ({ canUpdate: { value: true } }));
const deleteSession = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const fetchSessionThreads = vi.fn().mockResolvedValue(undefined);
const upsertSessionThread = vi.fn((thread: SessionThread) => {
	const historyIndex = sessionThreads.findIndex(({ id }) => id === thread.id);
	if (historyIndex === -1) sessionThreads.push(thread);
	else sessionThreads.splice(historyIndex, 1, thread);
	const previewIndex = previewSessionThreads.findIndex(({ id }) => id === thread.id);
	if (previewIndex !== -1) previewSessionThreads.splice(previewIndex, 1);
	if (thread.canContinueInPreview) {
		previewSessionThreads.push(thread);
		previewSessionThreads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}
});

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: routeParams, query: {} }),
	useRouter: () => ({
		push: routerPush,
		replace: routerReplace,
		resolve: () => ({ href: '#' }),
		options: { history: { state: {} } },
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ personalProject: { id: 'p1' }, currentProject: null, myProjects: [] }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		pushDisconnect: vi.fn(),
		addEventListener: (listener: (event: PushMessage) => void) => {
			pushListeners.add(listener);
			return () => pushListeners.delete(listener);
		},
	}),
}));

vi.mock('@/features/agents/agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: sessionThreads,
		previewThreads: previewSessionThreads,
		fetchThreads: fetchSessionThreads,
		upsertThread: upsertSessionThread,
	}),
}));

vi.mock('@/features/agents/composables/useAgentSessionLangSmithExport', () => ({
	useAgentSessionLangSmithExport: () => ({
		isEnabled: false,
		isExporting: false,
		sendSession: vi.fn(),
	}),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgent: vi.fn().mockResolvedValue({ id: 'a1', name: 'Agent One' }),
}));

vi.mock('@/features/agents/composables/useAgentConfig', () => ({
	useAgentConfig: () => ({
		config: { value: null },
		fetchConfig: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/features/agents/composables/useAgentPermissions', () => ({
	useAgentPermissions: () => agentPermissions,
}));

vi.mock('@/features/agents/composables/useAgentBuilderSession', async (importOriginal) => {
	const actual = await importOriginal<typeof AgentBuilderSessionModule>();
	return {
		...actual,
		useAgentBuilderSession: (...args: Parameters<typeof actual.useAgentBuilderSession>) => ({
			...actual.useAgentBuilderSession(...args),
			deleteSession,
		}),
	};
});

/** Mimic the backend recording a turn for `threadId`. */
function emitExecutionUpdate(threadId: string) {
	const event: PushMessage = {
		type: 'agentExecutionUpdated',
		data: { projectId: 'p1', agentId: 'a1', threadId, executionId: 'e1' },
	};
	for (const listener of [...pushListeners]) listener(event);
}

async function renderPrivateTimeline() {
	const wrapper = shallowMount(AgentSessionTimelineView);
	await flushPromises();
	wrapper.findComponent(AgentSessionTimelinePanel).vm.$emit('loaded', {
		thread: privateThread('thread-a'),
		executions: [],
	});
	await nextTick();
	return wrapper;
}

describe('AgentSessionTimelineView', () => {
	beforeEach(() => {
		localStorage.removeItem('N8N_AGENT_PREVIEW_OPEN:p1:a1');
		agentPermissions.canUpdate.value = true;
		deleteSession.mockClear();
		fetchSessionThreads.mockReset().mockResolvedValue(undefined);
		upsertSessionThread.mockClear();
		routeParams.threadId = 'thread-a';
		const initialThreads = [privateThread('thread-a'), privateThread('thread-c')];
		sessionThreads.splice(0, sessionThreads.length, ...initialThreads);
		previewSessionThreads.splice(0, previewSessionThreads.length, ...initialThreads);
		vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
			'thread-b' as unknown as ReturnType<typeof globalThis.crypto.randomUUID>,
		);
	});

	it('uses update permission for preview session deletion', async () => {
		agentPermissions.canUpdate.value = false;
		const wrapper = await renderPrivateTimeline();

		expect(wrapper.findComponent(AgentPreviewDock).props('canDeleteSession')).toBe(false);
	});

	it.each([
		{ kind: 'current', sessionId: 'thread-a', shouldRedirect: true },
		{ kind: 'non-current', sessionId: 'thread-c', shouldRedirect: false },
	])(
		'deletes a $kind preview session and redirects when needed',
		async ({ sessionId, shouldRedirect }) => {
			const wrapper = await renderPrivateTimeline();

			wrapper.findComponent(AgentPreviewDock).vm.$emit('delete-session', sessionId);
			await flushPromises();

			expect(deleteSession).toHaveBeenCalledExactlyOnceWith(sessionId);
			if (shouldRedirect) {
				expect(routerReplace).toHaveBeenCalledExactlyOnceWith({
					name: AGENT_BUILDER_VIEW,
					params: { projectId: 'p1', agentId: 'a1' },
					query: { section: EXECUTIONS_SECTION_KEY },
				});
			} else {
				expect(routerReplace).not.toHaveBeenCalled();
			}
		},
	);

	afterEach(() => {
		vi.restoreAllMocks();
		pushListeners.clear();
		routerPush.mockClear();
		routerReplace.mockClear();
	});

	it('shows Preview controls before a new session has metrics', () => {
		const wrapper = shallowMount(AgentSessionTimelineHeader, {
			props: {
				breadcrumbItems: [],
				sessionTitle: '',
				sessionOptions: [],
				showMetrics: false,
				triggerSource: null,
				triggerIcon: 'bolt-filled',
				triggerLabel: '',
				totalTokens: 0,
				totalCost: 0,
				durationLabel: '0ms',
				showLangsmithExport: false,
				langsmithExportLoading: false,
				showPreview: true,
			},
		});

		expect(wrapper.find('[data-testid="agent-session-timeline-preview-btn"]').exists()).toBe(true);
	});

	it('replaces the stale thread with an empty state when a new preview session starts', async () => {
		const wrapper = await renderPrivateTimeline();

		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(true);
		expect(wrapper.findComponent(N8nEmptyState).exists()).toBe(false);

		await wrapper.findComponent(AgentPreviewDock).vm.$emit('new-session');
		await nextTick();

		// The previous thread's error markers must not linger next to the new session.
		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(false);
		expect(wrapper.findComponent(N8nEmptyState).exists()).toBe(true);
		// Nothing to navigate to yet — the new session has no thread to fetch.
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('re-binds to the new session once the backend records its first turn', async () => {
		const wrapper = await renderPrivateTimeline();
		await wrapper.findComponent(AgentPreviewDock).vm.$emit('new-session');
		await nextTick();

		// A turn in some other thread of the same agent must not re-route this page.
		emitExecutionUpdate('thread-c');
		await flushPromises();
		expect(routerReplace).not.toHaveBeenCalled();

		emitExecutionUpdate('thread-b');
		await flushPromises();

		expect(routerReplace).toHaveBeenCalledWith({
			name: AGENT_SESSION_DETAIL_VIEW,
			params: { projectId: 'p1', agentId: 'a1', threadId: 'thread-b' },
		});
	});

	it('lets the dock name and act on the loaded thread even when the list lacks it', async () => {
		const wrapper = shallowMount(AgentSessionTimelineView);
		await flushPromises();
		// Drop the route's thread from the list, as for a session outside the first page.
		sessionThreads.splice(0, sessionThreads.length);
		await nextTick();

		const panel = wrapper.findComponent(AgentSessionTimelinePanel);
		expect(wrapper.findComponent(AgentPreviewDock).exists()).toBe(false);

		// A loaded thread that is not the live session must not stand in for it.
		await panel.vm.$emit('loaded', {
			thread: { ...privateThread('thread-z'), title: 'Other' },
			executions: [],
		});
		await nextTick();
		expect(wrapper.findComponent(AgentPreviewDock).exists()).toBe(false);

		await panel.vm.$emit('loaded', {
			thread: { ...privateThread('thread-a'), title: 'Digimon villains' },
			executions: [],
		});
		await nextTick();
		const dock = wrapper.findComponent(AgentPreviewDock);
		expect(dock.props('hasSession')).toBe(true);
		expect(dock.props('sessionTitle')).toBe('Digimon villains');
	});

	it('keeps a loaded preview session when the first page finishes later', async () => {
		const fetched = Promise.withResolvers<undefined>();
		sessionThreads.splice(0, sessionThreads.length);
		previewSessionThreads.splice(0, previewSessionThreads.length);
		fetchSessionThreads.mockImplementationOnce(async () => {
			await fetched.promise;
			const firstPage = privateThread('thread-c');
			sessionThreads.splice(0, sessionThreads.length, firstPage);
			previewSessionThreads.splice(0, previewSessionThreads.length, firstPage);
		});
		const wrapper = shallowMount(AgentSessionTimelineView);
		await nextTick();

		wrapper.findComponent(AgentSessionTimelinePanel).vm.$emit('loaded', {
			thread: privateThread('thread-a'),
			executions: [],
		});
		fetched.resolve(undefined);
		await flushPromises();

		expect(wrapper.findComponent(AgentPreviewDock).props('sessionOptions')).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: 'thread-a' })]),
		);
	});

	it('keeps the timeline when the preview switches to an existing session', async () => {
		const wrapper = await renderPrivateTimeline();

		await wrapper.findComponent(AgentPreviewDock).vm.$emit('session-select', 'thread-c');
		await nextTick();

		// That session already has a thread, so the dock's own trace action owns the
		// navigation — this page must not blank out or re-route on its own.
		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(true);
		expect(wrapper.findComponent(N8nEmptyState).exists()).toBe(false);
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('keeps an ineligible timeline read-only with a saved open dock', async () => {
		localStorage.setItem('N8N_AGENT_PREVIEW_OPEN:p1:a1', 'true');
		const wrapper = shallowMount(AgentSessionTimelineView);
		await flushPromises();
		wrapper.findComponent(AgentSessionTimelinePanel).vm.$emit('loaded', {
			thread: { ...privateThread('thread-a'), canContinueInPreview: false },
			executions: [],
		});
		await nextTick();

		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(true);
		expect(wrapper.findComponent(AgentPreviewDock).exists()).toBe(false);
		expect(wrapper.findComponent(AgentSessionTimelineHeader).props('showPreview')).toBe(false);
	});
});
