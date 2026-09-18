import { describe, expect, it, vi } from 'vitest';
import { useCreateAgent } from './useCreateAgent';

const mocks = vi.hoisted(() => ({
	routerPush: vi.fn(),
	trackClickedNewAgent: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('./useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackClickedNewAgent: mocks.trackClickedNewAgent }),
}));

describe('useCreateAgent', () => {
	it('mints an id, tracks the click, and pushes the builder route for it', () => {
		const { createAgent } = useCreateAgent();

		createAgent('button', 'project-1');

		expect(mocks.trackClickedNewAgent).toHaveBeenCalledWith('button', expect.any(String));
		const [, mintedAgentId] = mocks.trackClickedNewAgent.mock.calls[0] as [string, string];
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: 'AgentBuilderView',
			params: { projectId: 'project-1', agentId: mintedAgentId },
			state: { instanceAiPendingAgentId: mintedAgentId },
		});
	});
});
