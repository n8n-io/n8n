import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useMcpServerAssistantHandoff } from '../composables/useMcpServerAssistantHandoff';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import {
	clearPendingThreadHandoff,
	provisionLaunchedSubjectThread,
	stashPendingComposerDraft,
} from '../composables/useInstanceAiHandoff';

const { available, currentRoute, push, showError } = vi.hoisted(() => ({
	available: { value: true },
	currentRoute: { value: {} as object },
	push: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ currentRoute, push }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('../composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => available,
}));
vi.mock('../composables/useInstanceAiHandoff', () => ({
	provisionLaunchedSubjectThread: vi.fn(),
	stashPendingComposerDraft: vi.fn(),
	clearPendingThreadHandoff: vi.fn(),
}));

const SERVER_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f71';
const server = { serverId: SERVER_ID, projectId: 'project-1', serverName: 'Marketing tools' };

describe('useMcpServerAssistantHandoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		available.value = true;
		currentRoute.value = { name: 'McpServerView', params: { serverId: SERVER_ID } };
		vi.mocked(provisionLaunchedSubjectThread).mockResolvedValue('thread-new');
	});

	it('does not open the Assistant when it is not available', async () => {
		available.value = false;

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(false);
		expect(provisionLaunchedSubjectThread).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
	});

	it('always opens a new Assistant thread bound to the server', async () => {
		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);

		expect(provisionLaunchedSubjectThread).toHaveBeenCalledWith(
			{ type: 'mcpServer', id: SERVER_ID, projectId: 'project-1', name: 'Marketing tools' },
			{ source: 'mcp_server_page', origin: 'internal', sourceContext: { serverId: SERVER_ID } },
		);
		expect(stashPendingComposerDraft).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-new' },
		});
	});

	it('stashes the prompt when opened from "Build with Assistant"', async () => {
		const prefill = {
			text: 'Build out the MCP server "Marketing tools".',
			prefillType: 'mcp_server_build_prompt' as const,
		};

		await expect(useMcpServerAssistantHandoff().openServer({ ...server, prefill })).resolves.toBe(
			true,
		);

		expect(stashPendingComposerDraft).toHaveBeenCalledWith('thread-new', prefill);
		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-new' },
		});
	});

	it('drops the hand-off if navigation left the server page while provisioning', async () => {
		vi.mocked(provisionLaunchedSubjectThread).mockImplementation(async () => {
			currentRoute.value = { name: 'OtherView' };
			return 'thread-new';
		});

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(true);

		expect(clearPendingThreadHandoff).toHaveBeenCalledWith('thread-new');
		expect(push).not.toHaveBeenCalled();
	});

	it('shows an error toast when provisioning fails', async () => {
		const error = new Error('Network failed');
		vi.mocked(provisionLaunchedSubjectThread).mockRejectedValue(error);

		await expect(useMcpServerAssistantHandoff().openServer(server)).resolves.toBe(false);

		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		expect(push).not.toHaveBeenCalled();
	});
});
