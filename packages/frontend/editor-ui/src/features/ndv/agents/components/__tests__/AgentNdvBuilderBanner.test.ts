import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AgentNdvBuilderBanner from '../AgentNdvBuilderBanner.vue';
import { NdvAgentConfigKey } from '../../composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '../../composables/useNdvAgentConfig';
import type { AgentResource } from '@/features/agents/types';

const { createAndOpen, isCreatingHolder } = vi.hoisted(() => ({
	createAndOpen: vi.fn(),
	isCreatingHolder: { value: false },
}));
const { canCreateHolder } = vi.hoisted(() => ({ canCreateHolder: { value: true } }));
const { inlineCreateOptionsHolder } = vi.hoisted(() => ({
	inlineCreateOptionsHolder: { value: undefined as unknown },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/features/agents/composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canCreate: canCreateHolder }),
}));

vi.mock('@/features/agents/composables/useAgentInlineCreate', () => ({
	useAgentInlineCreate: (options: unknown) => {
		inlineCreateOptionsHolder.value = options;
		return { createAndOpen, isCreating: isCreatingHolder };
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
	props: { originNodeId?: string; isReadOnly?: boolean } = {},
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
		expect(wrapper.text()).toContain('agentNode.ndv.banner.suffix');
	});

	it('opens the referenced agent in the builder via the orchestrator', async () => {
		const stub = createNdvStub({ agentId: 'agent-1' });
		const wrapper = mountBanner(stub);

		await wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').trigger('click');

		expect(stub.openBuilder).toHaveBeenCalled();
		expect(createAndOpen).not.toHaveBeenCalled();
	});

	it('runs the inline-create flow when no agent is referenced', async () => {
		const stub = createNdvStub();
		const wrapper = mountBanner(stub, { originNodeId: 'node-1' });

		await wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').trigger('click');

		expect(createAndOpen).toHaveBeenCalled();
		expect(stub.openBuilder).not.toHaveBeenCalled();
	});

	it('emits setAgentReference when the inline-create flow references the new agent', async () => {
		const stub = createNdvStub();
		const wrapper = mountBanner(stub, { originNodeId: 'node-1' });

		const options = inlineCreateOptionsHolder.value as {
			setReference: (agent: AgentResource) => void;
			getOriginNodeId: () => string | undefined;
			telemetrySource: string;
		};
		expect(options.telemetrySource).toBe('ndv_banner');
		expect(options.getOriginNodeId()).toBe('node-1');

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

	it('keeps the link for an already-referenced agent in read-only mode', () => {
		const wrapper = mountBanner(createNdvStub({ agentId: 'agent-1' }), { isReadOnly: true });
		expect(wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').exists()).toBe(true);
	});

	it('disables the link while an inline create is in flight', () => {
		isCreatingHolder.value = true;
		const wrapper = mountBanner(createNdvStub());
		expect(wrapper.find('[data-test-id="agent-ndv-banner-open-builder"]').exists()).toBe(false);
	});
});
