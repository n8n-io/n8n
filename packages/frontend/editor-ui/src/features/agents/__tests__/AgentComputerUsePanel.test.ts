/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { AgentComputerUseStatusResponse } from '@n8n/api-types';

import AgentComputerUsePanel from '../components/AgentComputerUsePanel.vue';
import type { AgentJsonConfig } from '../types';

const getComputerUseStatus = vi.fn();
const createComputerUsePairingLink = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({ isAgentsComputerUseFeatureEnabled: true }),
}));

vi.mock('../composables/useAgentApi', () => ({
	getComputerUseStatus: (...args: unknown[]) => getComputerUseStatus(...args),
	createComputerUsePairingLink: (...args: unknown[]) => createComputerUsePairingLink(...args),
}));

const stubs = {
	N8nButton: { template: '<button><slot /></button>' },
	N8nIcon: { template: '<span />' },
	N8nIconButton: { template: '<button />' },
	N8nText: { template: '<span><slot /></span>' },
	N8nTooltip: { template: '<div><slot /></div>' },
	N8nSwitch2: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
};

function makeStatus(
	browser: AgentComputerUseStatusResponse['capabilities']['browser'],
): AgentComputerUseStatusResponse {
	return {
		moduleEnabled: true,
		connected: true,
		connectedAt: '2026-05-14T00:00:00.000Z',
		directory: '/workspace',
		hostIdentifier: 'user@host',
		capabilities: {
			filesystem: { enabled: true, write: true },
			shell: { enabled: true, processes: true },
			browser,
		},
	};
}

function makeConfig(computerUse: AgentJsonConfig['computerUse']): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help',
		computerUse,
	} as AgentJsonConfig;
}

async function mountPanel(config: AgentJsonConfig) {
	const wrapper = mount(AgentComputerUsePanel, {
		props: { config, projectId: 'project-1', agentId: 'agent-1' },
		global: { stubs },
	});
	await flushPromises();
	return wrapper;
}

describe('AgentComputerUsePanel', () => {
	it('disables browser toggle when gateway browser permission is not allow', async () => {
		getComputerUseStatus.mockResolvedValue(
			makeStatus({ enabled: true, permissionMode: 'ask', ready: false }),
		);

		const wrapper = await mountPanel(makeConfig({ enabled: true, browser: { enabled: false } }));

		expect(wrapper.text()).toContain('agents.builder.computerUse.disabled.browserPermission');
		expect(
			wrapper.find('[data-testid="agent-computer-use-browser-toggle"]').attributes('disabled'),
		).toBeDefined();
	});

	it('emits browser config changes when the browser toggle is available', async () => {
		getComputerUseStatus.mockResolvedValue(
			makeStatus({ enabled: true, permissionMode: 'allow', ready: true }),
		);

		const wrapper = await mountPanel(makeConfig({ enabled: true, browser: { enabled: false } }));
		await wrapper.find('[data-testid="agent-computer-use-browser-toggle"]').trigger('click');

		expect(wrapper.emitted('update:config')?.[0]?.[0]).toEqual({
			computerUse: {
				enabled: true,
				browser: { enabled: true },
			},
		});
	});
});
