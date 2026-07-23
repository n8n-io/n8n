import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import AgentNdvReferencedSummary from '../AgentNdvReferencedSummary.vue';
import { NdvAgentConfigKey } from '../../composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '../../composables/useNdvAgentConfig';
import type { AgentJsonConfig, AgentResource } from '@/features/agents/types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

// The friendly-name catalog is exercised elsewhere; keep it inert here.
vi.mock('@/features/agents/composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		catalog: ref({}),
		ensureLoaded: vi.fn().mockResolvedValue(undefined),
	}),
}));

const ChipsStub = {
	name: 'CanvasNodeAgentChips',
	props: ['chips', 'isReadOnly'],
	template: '<div data-testid="chips-stub" />',
};

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		tools: [],
		...overrides,
	};
}

function createNdvStub(
	overrides: Partial<{
		isAgentNode: boolean;
		agentId: string;
		config: AgentJsonConfig | null;
		agent: AgentResource | null;
		appliedSkills: Array<{ id: string; skill: { name: string } }>;
		loading: boolean;
		isUnavailable: boolean;
	}> = {},
) {
	const openBuilder = vi.fn();

	const value = {
		isAgentNode: computed(() => overrides.isAgentNode ?? true),
		mode: computed(() => 'referenced' as const),
		referenced: {
			agentId: computed(() => overrides.agentId ?? 'agent-1'),
			projectId: computed(() => 'project-1'),
			config: ref(overrides.config !== undefined ? overrides.config : makeConfig()),
			agent: ref(overrides.agent ?? null),
			appliedSkills: computed(() => overrides.appliedSkills ?? []),
			loading: ref(overrides.loading ?? false),
			isUnavailable: ref(overrides.isUnavailable ?? false),
			openBuilder,
		},
	} as unknown as UseNdvAgentConfigReturn;

	return { value, openBuilder };
}

function mountSummary(ndv: UseNdvAgentConfigReturn, props: { isReadOnly?: boolean } = {}) {
	setActivePinia(createTestingPinia());
	return mount(AgentNdvReferencedSummary, {
		props,
		global: {
			provide: { [NdvAgentConfigKey as symbol]: ndv },
			stubs: { CanvasNodeAgentChips: ChipsStub },
		},
	});
}

describe('AgentNdvReferencedSummary', () => {
	it('renders only when an agent is referenced', () => {
		const withAgent = mountSummary(createNdvStub().value);
		expect(withAgent.find('[data-test-id="agent-ndv-referenced-summary"]').exists()).toBe(true);

		const withoutAgent = mountSummary(createNdvStub({ agentId: '' }).value);
		expect(withoutAgent.find('[data-test-id="agent-ndv-referenced-summary"]').exists()).toBe(false);

		const nonAgent = mountSummary(createNdvStub({ isAgentNode: false }).value);
		expect(nonAgent.find('[data-test-id="agent-ndv-referenced-summary"]').exists()).toBe(false);
	});

	it('shows the agent name, instructions, and tool/skill chips read-only', () => {
		const { value } = createNdvStub({
			config: makeConfig({
				tools: [{ type: 'workflow', workflow: 'Lookup Orders' }],
			}),
			appliedSkills: [{ id: 'triage', skill: { name: 'Triage Issues' } }],
		});
		const wrapper = mountSummary(value);

		expect(wrapper.find('[data-test-id="agent-ndv-summary-name"]').text()).toBe('Support Agent');
		expect(wrapper.find('[data-test-id="agent-ndv-summary-instructions"]').text()).toBe(
			'Help the user.',
		);
		const chips = wrapper.findComponent(ChipsStub).props('chips') as Array<{ label: string }>;
		// Tool names are humanized to sentence case, mirroring the canvas card.
		expect(chips.map((chip) => chip.label)).toEqual(['Lookup orders', 'Triage Issues']);
	});

	it('opens the Agent Builder from the header link', async () => {
		const { value, openBuilder } = createNdvStub();
		const wrapper = mountSummary(value);

		await wrapper.find('[data-test-id="agent-ndv-edit-in-builder"]').trigger('click');

		expect(openBuilder).toHaveBeenCalled();
	});

	it('disables interactions in read-only workflows', () => {
		const wrapper = mountSummary(
			createNdvStub({ config: makeConfig({ tools: [{ type: 'workflow', workflow: 'Lookup' }] }) })
				.value,
			{ isReadOnly: true },
		);

		expect(wrapper.find('[data-test-id="agent-ndv-edit-in-builder"]').exists()).toBe(false);
		expect(wrapper.findComponent(ChipsStub).props('isReadOnly')).toBe(true);
	});

	it('shows the terminal unavailable state without the builder link', () => {
		const wrapper = mountSummary(createNdvStub({ isUnavailable: true }).value);

		expect(wrapper.find('[data-test-id="agent-ndv-unavailable"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="agent-ndv-edit-in-builder"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-ndv-summary-name"]').exists()).toBe(false);
	});

	it('shows the loading skeleton while the config fetch is in flight', () => {
		const wrapper = mountSummary(createNdvStub({ loading: true, config: null }).value);

		expect(wrapper.find('[data-test-id="agent-ndv-loading"]').exists()).toBe(true);
	});
});
