import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';

import { useAppAssistantHandoff } from '../composables/useAppAssistantHandoff';
import { useInstanceAiStore } from '../instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '../constants';
import { provisionLaunchedSubjectThread } from '../composables/useInstanceAiHandoff';
import { fetchThreadHistory } from '../instanceAi.memory.api';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useAssistantAgentThreadsStore } from '../assistantAgent/assistantAgentThreads.store';
import { listSystemAgentThreads } from '@/features/agents/composables/useAgentApi';

const { available, currentRoute, push, replace, showError } = vi.hoisted(() => ({
	available: { value: true },
	currentRoute: { value: {} as object },
	push: vi.fn(),
	replace: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ currentRoute, push, replace }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => available,
}));
vi.mock('../composables/useInstanceAiHandoff', () => ({ provisionLaunchedSubjectThread: vi.fn() }));
vi.mock('../instanceAi.memory.api', () => ({ fetchThreadHistory: vi.fn() }));
vi.mock('@/features/agents/composables/useAgentApi', () => ({ listSystemAgentThreads: vi.fn() }));

const APP_ID = '019a4012-272c-7313-91af-5c94a3d819a9';
const appMetadata = { instanceAiAppTargets: [{ appId: APP_ID, projectId: 'project-1' }] };

describe('useAppAssistantHandoff', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		available.value = true;
		store = mockedStore(useInstanceAiStore);
		store.loadThreads.mockResolvedValue(true);
		vi.mocked(fetchThreadHistory).mockResolvedValue({
			threads: [],
			nextCursor: null,
			hasMore: false,
		});
		currentRoute.value = {
			name: 'AppDetailView',
			params: { appId: '019a4012-272c-7313-91af-5c94a3d819a9', projectId: 'project-1' },
		};
	});

	it('does not open an App when Assistant is unavailable', async () => {
		available.value = false;

		await expect(
			useAppAssistantHandoff().openApp({
				appId: '019a4012-272c-7313-91af-5c94a3d819a9',
				projectId: 'project-1',
			}),
		).resolves.toBe(false);
		expect(store.loadThreads).not.toHaveBeenCalled();
	});

	it('opens the newest thread linked to the App', async () => {
		store.threads = [
			{
				id: 'thread-old',
				title: 'Older App thread',
				createdAt: '2026-10-01T10:00:00.000Z',
				updatedAt: '2026-10-01T10:00:00.000Z',
				metadata: {
					instanceAiAppTargets: [
						{ appId: '019a4012-272c-7313-91af-5c94a3d819a9', projectId: 'project-1' },
					],
				},
			},
			{
				id: 'thread-new',
				title: 'Newer App thread',
				createdAt: '2026-11-02T10:00:00.000Z',
				updatedAt: '2026-11-02T10:00:00.000Z',
				metadata: {
					instanceAiAppTargets: [
						{ appId: '019a4012-272c-7313-91af-5c94a3d819a9', projectId: 'project-1' },
					],
				},
			},
		];

		await useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});

		expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
		expect(fetchThreadHistory).not.toHaveBeenCalled();
		expect(replace).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-new' },
			query: { appId: '019a4012-272c-7313-91af-5c94a3d819a9' },
		});
	});

	it('creates a linked thread when the App has no thread', async () => {
		vi.mocked(provisionLaunchedSubjectThread).mockResolvedValue('thread-2');

		await useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
			appName: 'Portal',
		});

		expect(provisionLaunchedSubjectThread).toHaveBeenCalledWith(
			{
				type: 'app',
				id: '019a4012-272c-7313-91af-5c94a3d819a9',
				projectId: 'project-1',
				name: 'Portal',
			},
			expect.objectContaining({ source: 'app_builder_page' }),
		);
		expect(replace).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-2' },
			query: { appId: '019a4012-272c-7313-91af-5c94a3d819a9' },
		});
	});

	it('opens an older linked thread from a later history page', async () => {
		vi.mocked(fetchThreadHistory)
			.mockResolvedValueOnce({ threads: [], nextCursor: 'next-page', hasMore: true })
			.mockResolvedValueOnce({
				threads: [
					{
						id: 'thread-old',
						resourceId: 'user-1',
						createdAt: '2026-01-01T10:00:00.000Z',
						updatedAt: '2026-01-01T10:00:00.000Z',
						metadata: {
							instanceAiAppTargets: [
								{
									appId: '019a4012-272c-7313-91af-5c94a3d819a9',
									projectId: 'project-1',
								},
							],
						},
					},
				],
				nextCursor: null,
				hasMore: false,
			});

		await useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});

		expect(fetchThreadHistory).toHaveBeenNthCalledWith(2, expect.anything(), {
			limit: 100,
			cursor: 'next-page',
		});
		expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
		expect(replace).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-old' },
			query: { appId: '019a4012-272c-7313-91af-5c94a3d819a9' },
		});
	});

	it('does not continue the lookup after the user leaves', async () => {
		const history = Promise.withResolvers<{
			threads: [];
			nextCursor: string;
			hasMore: true;
		}>();
		vi.mocked(fetchThreadHistory).mockReturnValue(history.promise);
		const result = useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});
		await vi.waitFor(() => expect(fetchThreadHistory).toHaveBeenCalledOnce());

		currentRoute.value = { name: 'ProjectApps' };
		history.resolve({ threads: [], nextCursor: 'next-page', hasMore: true });

		await expect(result).resolves.toBe(true);
		expect(fetchThreadHistory).toHaveBeenCalledOnce();
		expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
	});

	it('does not open a thread after the user leaves while threads load', async () => {
		const loading = Promise.withResolvers<boolean>();
		store.loadThreads.mockReturnValue(loading.promise);
		const result = useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});

		currentRoute.value = { name: 'ProjectApps' };
		loading.resolve(true);

		await expect(result).resolves.toBe(true);
		expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
	});

	it('does not open a provisioned thread after the user leaves', async () => {
		const provisioning = Promise.withResolvers<string>();
		vi.mocked(provisionLaunchedSubjectThread).mockReturnValue(provisioning.promise);
		const result = useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});
		await vi.waitFor(() => expect(provisionLaunchedSubjectThread).toHaveBeenCalledOnce());

		currentRoute.value = { name: 'ProjectApps' };
		provisioning.resolve('thread-2');

		await expect(result).resolves.toBe(true);
		expect(replace).not.toHaveBeenCalled();
	});

	it('does not report a handoff failure after the user leaves', async () => {
		const provisioning = Promise.withResolvers<string>();
		vi.mocked(provisionLaunchedSubjectThread).mockReturnValue(provisioning.promise);
		const result = useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});
		await vi.waitFor(() => expect(provisionLaunchedSubjectThread).toHaveBeenCalledOnce());

		currentRoute.value = { name: 'ProjectApps' };
		provisioning.reject(new Error('Failed to provision'));

		await expect(result).resolves.toBe(true);
		expect(showError).not.toHaveBeenCalled();
	});

	describe('with the Assistant agent', () => {
		let threadsStore: ReturnType<typeof mockedStore<typeof useAssistantAgentThreadsStore>>;

		beforeEach(() => {
			mockedStore(useInstanceAiSettingsStore).newThreadsUseAssistantAgent = true;
			threadsStore = mockedStore(useAssistantAgentThreadsStore);
			threadsStore.knownThreads = [];
			vi.mocked(listSystemAgentThreads).mockResolvedValue({ data: [], nextCursor: null });
		});

		it('opens an Assistant agent thread of the App from a later page', async () => {
			const thread = {
				id: 'agent-thread',
				title: 'App chat',
				updatedAt: '2026-11-02T10:00:00.000Z',
				projectId: 'project-1',
				metadata: appMetadata,
			};
			vi.mocked(listSystemAgentThreads)
				.mockResolvedValueOnce({ data: [], nextCursor: 'next-page' })
				.mockResolvedValueOnce({ data: [thread], nextCursor: null });

			await useAppAssistantHandoff().openApp({ appId: APP_ID, projectId: 'project-1' });

			expect(listSystemAgentThreads).toHaveBeenNthCalledWith(2, expect.anything(), 'assistant', {
				limit: 100,
				cursor: 'next-page',
			});
			expect(threadsStore.addOpenedThread).toHaveBeenCalledWith(thread);
			expect(store.loadThreads).not.toHaveBeenCalled();
			expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
			expect(replace).toHaveBeenCalledWith({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: 'agent-thread' },
				query: { appId: APP_ID },
			});
		});

		it('asks the server even when this tab knows an older thread of the App', async () => {
			threadsStore.knownThreads = [
				{
					id: 'older-thread',
					title: 'App chat',
					updatedAt: '2026-10-02T10:00:00.000Z',
					projectId: 'project-1',
					metadata: appMetadata,
				},
			];
			const newer = {
				...threadsStore.knownThreads[0],
				id: 'newer-thread',
				updatedAt: '2026-11-02T10:00:00.000Z',
			};
			vi.mocked(listSystemAgentThreads).mockResolvedValueOnce({ data: [newer], nextCursor: null });

			await useAppAssistantHandoff().openApp({ appId: APP_ID, projectId: 'project-1' });

			expect(replace).toHaveBeenCalledWith(
				expect.objectContaining({ params: { threadId: 'newer-thread' } }),
			);
		});

		it('keeps a thread of the App from the current runtime', async () => {
			store.threads = [
				{
					id: 'current-thread',
					title: 'App chat',
					createdAt: '2026-10-01T10:00:00.000Z',
					updatedAt: '2026-10-01T10:00:00.000Z',
					metadata: appMetadata,
				},
			];

			await useAppAssistantHandoff().openApp({ appId: APP_ID, projectId: 'project-1' });

			expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
			expect(replace).toHaveBeenCalledWith(
				expect.objectContaining({ params: { threadId: 'current-thread' } }),
			);
		});

		it('starts a thread on the App when the App has no thread', async () => {
			vi.mocked(provisionLaunchedSubjectThread).mockResolvedValue('agent-thread-new');

			await useAppAssistantHandoff().openApp({ appId: APP_ID, projectId: 'project-1' });

			expect(listSystemAgentThreads).toHaveBeenCalled();
			expect(provisionLaunchedSubjectThread).toHaveBeenCalledWith(
				{ type: 'app', id: APP_ID, projectId: 'project-1' },
				expect.objectContaining({ source: 'app_builder_page' }),
			);
			expect(replace).toHaveBeenCalledWith({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: 'agent-thread-new' },
				query: { appId: APP_ID },
			});
		});
	});

	it('opens the wide empty state for a new App', async () => {
		await useAppAssistantHandoff().createApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});

		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_VIEW,
			query: {
				pendingAppId: '019a4012-272c-7313-91af-5c94a3d819a9',
				projectId: 'project-1',
				source: 'app_builder_page',
			},
		});
	});
});
