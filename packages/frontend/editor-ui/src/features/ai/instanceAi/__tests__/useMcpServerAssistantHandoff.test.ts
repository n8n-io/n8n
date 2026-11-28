import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';

import { useMcpServerAssistantHandoff } from '../composables/useMcpServerAssistantHandoff';
import { useInstanceAiStore } from '../instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { provisionLaunchedSubjectThread } from '../composables/useInstanceAiHandoff';
import { fetchThreadHistory } from '../instanceAi.memory.api';

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

const SERVER_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f71';
const server = { serverId: SERVER_ID, projectId: 'project-1', serverName: 'Marketing tools' };

describe('useMcpServerAssistantHandoff', () => {
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
		currentRoute.value = { name: 'McpServerView', params: { serverId: SERVER_ID } };
	});

	it('does not open the Assistant when it is not available', async () => {
		available.value = false;

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(false);
		expect(push).not.toHaveBeenCalled();
	});

	it('opens the newest Assistant thread of the server', async () => {
		store.threads = [
			{
				id: 'thread-server',
				title: 'Server thread',
				createdAt: '2026-11-24T10:00:00.000Z',
				updatedAt: '2026-11-24T10:00:00.000Z',
				metadata: { instanceAiMcpServerTarget: { serverId: SERVER_ID, projectId: 'project-1' } },
			},
			{
				id: 'thread-other',
				title: 'Other thread',
				createdAt: '2026-11-25T10:00:00.000Z',
				updatedAt: '2026-11-25T10:00:00.000Z',
				metadata: {},
			},
		];

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);

		expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-server' },
		});
	});

	it('opens a new Assistant thread bound to the server', async () => {
		vi.mocked(provisionLaunchedSubjectThread).mockResolvedValue('thread-2');

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);

		expect(provisionLaunchedSubjectThread).toHaveBeenCalledWith(
			{ type: 'mcpServer', id: SERVER_ID, projectId: 'project-1', name: 'Marketing tools' },
			{ source: 'mcp_server_page', origin: 'internal', sourceContext: { serverId: SERVER_ID } },
		);
		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-2' },
		});
	});
});
