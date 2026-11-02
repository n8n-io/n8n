import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';

import { useAppAssistantHandoff } from '../composables/useAppAssistantHandoff';
import { useInstanceAiStore } from '../instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '../constants';
import { provisionSubjectThread } from '../composables/useInstanceAiHandoff';

const { push, replace, showError } = vi.hoisted(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('../composables/useInstanceAiHandoff', () => ({ provisionSubjectThread: vi.fn() }));

describe('useAppAssistantHandoff', () => {
	let store: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		store = mockedStore(useInstanceAiStore);
		store.loadThreads.mockResolvedValue(true);
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
