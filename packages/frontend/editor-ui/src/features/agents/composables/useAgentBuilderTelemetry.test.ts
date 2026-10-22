import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';

import { useAgentBuilderTelemetry } from './useAgentBuilderTelemetry';
import type { AgentJsonConfig, AgentResource } from '../types';

const trackRemovedTrigger = vi.fn();
vi.mock('./useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackRemovedTrigger }),
}));

describe('useAgentBuilderTelemetry', () => {
	it('reports a removed trigger with only the triggers that remain', async () => {
		// The local config still lists the removed channel until the agent reloads.
		const localConfig = ref<AgentJsonConfig | null>({
			name: 'Support Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Help the user.',
			integrations: [
				{ type: 'n8n_chat', credentialId: '' },
				{ type: 'slack', credentialId: 'cred-1' },
			],
		} as AgentJsonConfig);
		const telemetry = useAgentBuilderTelemetry({
			agentId: ref('agent-1'),
			projectId: ref('project-1'),
			agent: ref<AgentResource | null>(null),
			localConfig,
		});

		telemetry.trackTriggerRemoved({ triggerType: 'n8n_chat', triggers: ['slack'] });

		await vi.waitFor(() =>
			expect(trackRemovedTrigger).toHaveBeenCalledExactlyOnceWith({
				agentId: 'agent-1',
				triggerType: 'n8n_chat',
				triggers: ['slack'],
				configVersion: expect.any(String),
				status: 'draft',
			}),
		);
	});
});
