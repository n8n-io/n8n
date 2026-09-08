import type { AgentJsonConfig } from '@n8n/api-types';
import { useAgentConfig } from '../composables/useAgentConfig';

const { getAgentConfigMock, updateAgentConfigMock } = vi.hoisted(() => ({
	getAgentConfigMock: vi.fn(),
	updateAgentConfigMock: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentConfig: getAgentConfigMock,
	updateAgentConfig: updateAgentConfigMock,
}));

const config: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

describe('useAgentConfig', () => {
	it('uses the latest server hash for consecutive config updates', async () => {
		getAgentConfigMock.mockResolvedValue({ config, configHash: 'hash-0' });
		updateAgentConfigMock
			.mockResolvedValueOnce({
				config: { ...config, instructions: 'First edit' },
				configHash: 'hash-1',
				versionId: 'version-1',
			})
			.mockResolvedValueOnce({
				config: { ...config, instructions: 'Second edit' },
				configHash: 'hash-2',
				versionId: 'version-1',
			});
		const state = useAgentConfig();

		await state.fetchConfig('project-1', 'agent-1');
		await state.updateConfig('project-1', 'agent-1', {
			...config,
			instructions: 'First edit',
		});
		await state.updateConfig('project-1', 'agent-1', {
			...config,
			instructions: 'Second edit',
		});

		expect(updateAgentConfigMock.mock.calls.map((call) => call.at(-1))).toEqual([
			'hash-0',
			'hash-1',
		]);
	});
});
