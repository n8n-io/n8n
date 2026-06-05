import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentJsonConfig, AgentResource } from '../types';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';

const { trackEditedConfigMock } = vi.hoisted(() => ({
	trackEditedConfigMock: vi.fn(),
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({
		trackEditedConfig: trackEditedConfigMock,
		trackAddedTrigger: vi.fn(),
		trackAddedTools: vi.fn(),
		trackAddedSkills: vi.fn(),
		trackOpenedToolFromList: vi.fn(),
		trackOpenedSkillFromList: vi.fn(),
		trackOpenedAddSkillModal: vi.fn(),
	}),
}));

vi.mock('../composables/useAgentIntegrationStatus', () => ({
	syncAgentIntegrationStatusCache: vi.fn(),
}));

describe('useAgentBuilderTelemetry', () => {
	const baseConfig: AgentJsonConfig = {
		name: 'Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
	};

	beforeEach(() => {
		trackEditedConfigMock.mockReset();
	});

	it('tracks sub-agent config edits after they are saved', async () => {
		const savedConfig: AgentJsonConfig = {
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					high: { model: 'anthropic/claude-haiku-4-5', credential: 'anthropic-cred' },
				},
			},
		};
		const telemetry = useAgentBuilderTelemetry({
			agentId: ref('agent-1'),
			projectId: ref('project-1'),
			agent: ref({ activeVersionId: null, versionId: 'draft-1' } as AgentResource),
			localConfig: ref(baseConfig),
			savedConfig: ref(savedConfig),
			connectedTriggers: ref([]),
		});

		telemetry.recordConfigEdit({ subAgents: savedConfig.subAgents });
		telemetry.flushConfigEdits();

		await vi.waitFor(() => {
			expect(trackEditedConfigMock).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					part: 'subAgents',
					status: 'draft',
					configVersion: expect.stringMatching(/^[0-9a-f]{16}$/),
				}),
			);
		});
	});
});
