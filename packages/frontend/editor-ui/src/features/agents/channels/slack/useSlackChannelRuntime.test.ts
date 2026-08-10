import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSlackChannelRuntime } from './useSlackChannelRuntime';

const { createSlackAgentApp } = vi.hoisted(() => ({
	createSlackAgentApp: vi.fn().mockResolvedValue({ installUrl: 'https://slack.test/install' }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('./api', () => ({
	createSlackAgentApp,
}));

describe('useSlackChannelRuntime', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('completes manual setup when a final poll confirms the connection', async () => {
		vi.useFakeTimers();

		class FakeBroadcastChannel {
			addEventListener() {}
			close() {}
		}
		vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

		const popup = { closed: false, close: vi.fn() };
		vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);

		let resolveFirstPoll!: () => void;
		const firstPoll = new Promise<void>((resolve) => {
			resolveFirstPoll = resolve;
		});
		let isConfigured = false;
		const fetchStatus = vi.fn().mockImplementation(async () => {
			if (fetchStatus.mock.calls.length === 1) await firstPoll;
		});
		const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
		const onConnected = vi.fn();
		const runtime = useSlackChannelRuntime({
			projectId: ref('project-1'),
			agentId: ref('agent-1'),
			selectedCredentialId: ref(''),
			credentialModalOpen: ref(false),
			fetchStatus,
			isConnected: () => false,
			isConfigured: () => isConfigured,
			ensureAgentPersisted,
		});

		const setupPromise = runtime.setupApp('token', onConnected);
		await vi.advanceTimersByTimeAsync(0);

		popup.closed = true;
		await vi.advanceTimersByTimeAsync(2000);
		isConfigured = true;
		resolveFirstPoll();

		await expect(setupPromise).resolves.toBe(true);
		expect(ensureAgentPersisted).toHaveBeenCalledOnce();
		expect(createSlackAgentApp).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'token');
		expect(onConnected).toHaveBeenCalledOnce();
	});
});
