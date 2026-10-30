import { describe, expect, it, vi } from 'vitest';
import { PENDING_AGENT_STARTER_STATE } from '../constants';
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

	it('carries a template starter and reports its id', () => {
		const { createAgent } = useCreateAgent();

		createAgent('empty_state_template', 'project-1', {
			kind: 'template',
			templateId: 'morning-news-brief',
		});

		const [, mintedAgentId, templateId] = mocks.trackClickedNewAgent.mock.calls[0] as [
			string,
			string,
			string,
		];
		expect(mocks.trackClickedNewAgent).toHaveBeenCalledWith(
			'empty_state_template',
			mintedAgentId,
			'morning-news-brief',
		);
		expect(templateId).toBe('morning-news-brief');
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: 'AgentBuilderView',
			params: { projectId: 'project-1', agentId: mintedAgentId },
			state: {
				instanceAiPendingAgentId: mintedAgentId,
				[PENDING_AGENT_STARTER_STATE]: {
					kind: 'template',
					templateId: 'morning-news-brief',
				},
			},
		});
	});

	it('carries a typed prompt without a template id', () => {
		const { createAgent } = useCreateAgent();

		createAgent('empty_state_prompt', 'project-1', { kind: 'prompt', text: 'Summarize my inbox' });

		const [, mintedAgentId] = mocks.trackClickedNewAgent.mock.calls[0] as [string, string];
		expect(mocks.trackClickedNewAgent).toHaveBeenCalledWith('empty_state_prompt', mintedAgentId);
		expect(mocks.routerPush).toHaveBeenCalledWith(
			expect.objectContaining({
				state: {
					instanceAiPendingAgentId: mintedAgentId,
					[PENDING_AGENT_STARTER_STATE]: { kind: 'prompt', text: 'Summarize my inbox' },
				},
			}),
		);
	});
});
