import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';

import { useAgentBuilderTelemetry } from './useAgentBuilderTelemetry';
import {
	clearAgentIntegrationStatusCache,
	useAgentIntegrationStatus,
} from './useAgentIntegrationStatus';
import type { AgentJsonConfig, AgentResource } from '../types';

const trackRemovedTrigger = vi.fn();
vi.mock('./useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackRemovedTrigger }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
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

	it('seeds the setup forms with the settings of draft channels', async () => {
		clearAgentIntegrationStatusCache('project-1', 'agent-1');
		const draftSettings = { accessMode: 'private' as const, allowedUsers: ['alice'] };
		const telemetry = useAgentBuilderTelemetry({
			agentId: ref('agent-1'),
			projectId: ref('project-1'),
			agent: ref<AgentResource | null>(null),
			localConfig: ref<AgentJsonConfig | null>({
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				integrations: [
					{ type: 'slack', credentialId: 'cred-1' },
					{ type: 'telegram', credentialId: '', settings: draftSettings },
				],
			} as AgentJsonConfig),
		});

		await telemetry.fetchInitialTriggersBaseline(['slack', 'telegram']);

		const status = useAgentIntegrationStatus('project-1', 'agent-1');
		expect(status.integrationSettings.value.telegram).toEqual(draftSettings);
		expect(status.isConfigured('telegram')).toBe(false);
		expect(status.isConfigured('slack')).toBe(true);
	});
});
