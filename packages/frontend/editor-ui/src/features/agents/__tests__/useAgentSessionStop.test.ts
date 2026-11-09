import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useAgentSessionStop } from '../composables/useAgentSessionStop';

const { stopSessionMock, showErrorMock } = vi.hoisted(() => ({
	stopSessionMock: vi.fn(),
	showErrorMock: vi.fn(),
}));
const canExecute = ref(true);
const restApiContext = { baseUrl: '/rest', pushRef: 'push-ref' };

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext }),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canExecute }),
}));
vi.mock('../composables/useAgentThreadsApi', () => ({ stopSession: stopSessionMock }));

describe('useAgentSessionStop', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		canExecute.value = true;
		stopSessionMock.mockReset().mockResolvedValue({ cancelRequested: true });
	});

	it('uses the current project and agent when stopping a session', async () => {
		const projectId = ref('project-1');
		const agentId = ref('agent-1');
		const session = useAgentSessionStop(projectId, () => agentId.value);
		projectId.value = 'project-2';
		agentId.value = 'agent-2';

		await expect(session.stop('thread-1')).resolves.toBe(true);
		expect(stopSessionMock).toHaveBeenCalledExactlyOnceWith(
			restApiContext,
			'project-2',
			'agent-2',
			'thread-1',
		);
		expect(session.stoppingSessionIds.value.size).toBe(0);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('checks execute permission when the user selects Stop', async () => {
		const session = useAgentSessionStop('project-1', 'agent-1');
		canExecute.value = false;

		expect(session.canStop.value).toBe(false);
		await expect(session.stop('thread-1')).resolves.toBe(false);
		expect(stopSessionMock).not.toHaveBeenCalled();
		expect(session.stoppingSessionIds.value.size).toBe(0);
	});

	it('allows one pending request per session', async () => {
		const pending = Promise.withResolvers<{ cancelRequested: boolean }>();
		stopSessionMock.mockReturnValueOnce(pending.promise);
		const session = useAgentSessionStop('project-1', 'agent-1');
		const stopping = session.stop('thread-1');

		expect(session.stoppingSessionIds.value.has('thread-1')).toBe(true);
		await expect(session.stop('thread-1')).resolves.toBe(false);
		await expect(session.stop('thread-2')).resolves.toBe(true);
		expect(stopSessionMock).toHaveBeenCalledTimes(2);
		pending.resolve({ cancelRequested: true });
		await expect(stopping).resolves.toBe(true);
		expect(session.stoppingSessionIds.value.size).toBe(0);
	});

	it('shows an error and allows another attempt after a failed request', async () => {
		const error = new Error('Stop failed');
		stopSessionMock.mockRejectedValueOnce(error);
		const session = useAgentSessionStop('project-1', 'agent-1');

		await expect(session.stop('thread-1')).resolves.toBe(false);
		expect(showErrorMock).toHaveBeenCalledExactlyOnceWith(error, 'agentSessions.showError.stop');
		expect(session.stoppingSessionIds.value.size).toBe(0);
		await expect(session.stop('thread-1')).resolves.toBe(true);
		expect(stopSessionMock).toHaveBeenCalledTimes(2);
	});
});
