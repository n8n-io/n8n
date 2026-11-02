import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';

import { useAppAssistantHandoff } from '../composables/useAppAssistantHandoff';
import { useInstanceAiStore } from '../instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '../constants';
import { provisionSubjectThread } from '../composables/useInstanceAiHandoff';
import { fetchThreadHistory } from '../instanceAi.memory.api';

const { currentRoute, push, replace, showError } = vi.hoisted(() => ({
	currentRoute: { value: {} as object },
	push: vi.fn(),
	replace: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ currentRoute, push, replace }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('../composables/useInstanceAiHandoff', () => ({ provisionSubjectThread: vi.fn() }));
vi.mock('../instanceAi.memory.api', () => ({ fetchThreadHistory: vi.fn() }));

describe('useAppAssistantHandoff', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
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

	it('opens the newest thread linked to the App', async () => {
		store.threads = [
			{
				id: 'thread-1',
				title: 'App thread',
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

		expect(provisionSubjectThread).not.toHaveBeenCalled();
		expect(replace).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-1' },
			query: { appId: '019a4012-272c-7313-91af-5c94a3d819a9' },
		});
	});

	it('creates a linked thread when the App has no thread', async () => {
		vi.mocked(provisionSubjectThread).mockResolvedValue('thread-2');

		await useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
			appName: 'Portal',
		});

		expect(provisionSubjectThread).toHaveBeenCalledWith(
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
		expect(provisionSubjectThread).not.toHaveBeenCalled();
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
		expect(provisionSubjectThread).not.toHaveBeenCalled();
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
		expect(provisionSubjectThread).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
	});

	it('does not open a provisioned thread after the user leaves', async () => {
		const provisioning = Promise.withResolvers<string>();
		vi.mocked(provisionSubjectThread).mockReturnValue(provisioning.promise);
		const result = useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});
		await vi.waitFor(() => expect(provisionSubjectThread).toHaveBeenCalledOnce());

		currentRoute.value = { name: 'ProjectApps' };
		provisioning.resolve('thread-2');

		await expect(result).resolves.toBe(true);
		expect(replace).not.toHaveBeenCalled();
	});

	it('does not report a handoff failure after the user leaves', async () => {
		const provisioning = Promise.withResolvers<string>();
		vi.mocked(provisionSubjectThread).mockReturnValue(provisioning.promise);
		const result = useAppAssistantHandoff().openApp({
			appId: '019a4012-272c-7313-91af-5c94a3d819a9',
			projectId: 'project-1',
		});
		await vi.waitFor(() => expect(provisionSubjectThread).toHaveBeenCalledOnce());

		currentRoute.value = { name: 'ProjectApps' };
		provisioning.reject(new Error('Failed to provision'));

		await expect(result).resolves.toBe(true);
		expect(showError).not.toHaveBeenCalled();
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
