import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AgentNdvBuilderBanner from '../AgentNdvBuilderBanner.vue';
import { NdvAgentConfigKey } from '../../composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '../../composables/useNdvAgentConfig';
import type { AgentResource } from '@/features/agents/types';

const { createAndSelect, createAndOpenBuilder, isCreatingHolder } = vi.hoisted(() => ({
	createAndSelect: vi.fn(),
	createAndOpenBuilder: vi.fn(),
	isCreatingHolder: { value: false },
}));
const { canCreateHolder } = vi.hoisted(() => ({ canCreateHolder: { value: true } }));
const { agentCreateOptionsHolder } = vi.hoisted(() => ({
	agentCreateOptionsHolder: { value: undefined as unknown },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/features/agents/composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canCreate: canCreateHolder }),
}));

vi.mock('@/features/agents/composables/useAgentCreate', () => ({
	useAgentCreate: (options: unknown) => {
		agentCreateOptionsHolder.value = options;
		return { createAndSelect, createAndOpenBuilder, isCreating: isCreatingHolder };
	},
}));

function createNdvStub(overrides: { agentId?: string } = {}) {
	const openBuilder = vi.fn();
	const value = {
		isAgentNode: computed(() => true),
		agentId: computed(() => overrides.agentId ?? ''),
		projectId: computed(() => 'project-1'),
		openBuilder,
	} as unknown as UseNdvAgentConfigReturn;
	return { value, openBuilder };
}

function mountBanner(
	stub: { value: UseNdvAgentConfigReturn },
	props: { isReadOnly?: boolean; originNodeId?: string } = {},
) {
	return mount(AgentNdvBuilderBanner, {
		props,
		global: {
			provide: { [NdvAgentConfigKey as symbol]: stub.value },
		},
	});
}

describe('AgentNdvBuilderBanner', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		canCreateHolder.value = true;
		isCreatingHolder.value = false;
	});

	it('renders the banner with the promo copy', () => {
		const wrapper = mountBanner(createNdvStub());
		expect(wrapper.find('[data-test-id="agent-ndv-builder-banner"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('agentNode.ndv.banner.prefix');
		expect(wrapper.text()).toContain('agentNode.ndv.banner.link');
	});

	it('hides the banner once an agent is referenced (the Agent section header link takes over)', () => {
		const wrapper = mountBanner(createNdvStub({ agentId: 'agent-1' }));
		expect(wrapper.find('[data-test-id="agent-ndv-builder-banner"]').exists()).toBe(false);
	});

	it('creates a draft and opens the builder when no agent is referenced', async () => {
		const stub = createNdvStub();
		const wrapper = mountBanner(stub);

		await wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').trigger('click');

		expect(createAndOpenBuilder).toHaveBeenCalled();
		// Navigation is owned by the create flow, not the orchestrator.
		expect(stub.openBuilder).not.toHaveBeenCalled();
	});

	it('emits setAgentReference when the create flow references the new agent', () => {
		const stub = createNdvStub();
		const wrapper = mountBanner(stub, { originNodeId: 'node-7' });

		const options = agentCreateOptionsHolder.value as {
			setReference: (agent: AgentResource) => void;
			getOriginNodeId?: () => string | undefined;
			telemetrySource: string;
		};
		expect(options.telemetrySource).toBe('ndv_banner');
		expect(options.getOriginNodeId?.()).toBe('node-7');

		options.setReference({ id: 'agent-9', name: 'Fresh Agent' } as AgentResource);
		expect(wrapper.emitted('setAgentReference')).toEqual([
			[{ __rl: true, value: 'agent-9', mode: 'list', cachedResultName: 'Fresh Agent' }],
		]);
	});

	it('renders plain text instead of a link when creation is not possible', () => {
		canCreateHolder.value = false;
		const wrapper = mountBanner(createNdvStub());

		expect(wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('agentNode.ndv.banner.link');
	});

	it('renders plain text in read-only mode with no agent referenced', () => {
		const wrapper = mountBanner(createNdvStub(), { isReadOnly: true });
		expect(wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').exists()).toBe(false);
	});

	it('disables the link while a create is in flight', () => {
		isCreatingHolder.value = true;
		const wrapper = mountBanner(createNdvStub());
		expect(wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').exists()).toBe(false);
	});
});
