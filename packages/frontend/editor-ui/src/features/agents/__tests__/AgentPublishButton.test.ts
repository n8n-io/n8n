import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { MODAL_CONFIRM, MODAL_CANCEL } from '@/app/constants';
import type { AgentResource } from '../types';
import type { AgentPublishedVersion } from '../agent.types';

vi.mock('../composables/useAgentApi', () => ({
	publishAgent: vi.fn(),
	unpublishAgent: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useMessage', () => {
	const confirm = vi.fn(async () => MODAL_CONFIRM);
	return { useMessage: () => ({ confirm }) };
});

vi.mock('@/app/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return { useToast: () => ({ showMessage, showError }) };
});

const STUBS = {
	N8nButton: {
		template:
			'<button :disabled="disabled || loading || undefined" @click="$emit(\'click\')"><slot /></button>',
		props: ['disabled', 'loading', 'variant'],
		emits: ['click'],
	},
	N8nIconButton: {
		template: '<button @click="$emit(\'click\')" />',
		props: ['icon', 'variant', 'ariaLabel'],
		emits: ['click'],
	},
	// N8nActionDropdown has no defineOptions name, Vue infers it as 'ActionDropdown' from filename
	ActionDropdown: {
		name: 'ActionDropdown',
		template:
			'<div><button v-for="item in items" :key="item.id" :data-action="item.id" :disabled="item.disabled || undefined" @click="$emit(\'select\', item.id)">{{ item.label }}</button></div>',
		props: ['items', 'placement', 'activatorIcon'],
		emits: ['select'],
	},
};

const publishedVersion: AgentPublishedVersion = {
	schema: null,
	model: null,
	provider: null,
	credentialId: null,
	publishedAt: '2026-01-01T00:00:00Z',
	publishedById: null,
};

function createAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		resourceType: 'agent',
		id: 'agent-1',
		name: 'My Agent',
		description: null,
		projectId: 'project-1',
		credentialId: null,
		provider: null,
		model: null,
		isCompiled: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		versionId: 'v1',
		activeVersionId: null,
		tools: {},
		publishedVersion: null,
		...overrides,
	};
}

interface RenderProps {
	agent?: AgentResource | null;
	projectId?: string;
	agentId?: string;
}

describe('AgentPublishButton', () => {
	async function renderComponent(props: RenderProps = {}) {
		const { default: AgentPublishButton } = await import('../components/AgentPublishButton.vue');
		return mount(AgentPublishButton, {
			props: {
				agent: createAgent(),
				projectId: 'project-1',
				agentId: 'agent-1',
				...props,
			},
			global: { stubs: STUBS },
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Button states
	it('shows "Publish" and is enabled when agent is not published', async () => {
		const agent = createAgent({ publishedVersion: null, activeVersionId: null });
		const wrapper = await renderComponent({ agent });
		const button = wrapper.find('[data-testid="publish-agent-button"]');
		expect(button.text()).toContain('agents.publish.button.publish');
		expect(button.attributes('disabled')).toBeUndefined();
	});

	it('shows "Published" and is disabled when latest version is published', async () => {
		const agent = createAgent({ versionId: 'v1', activeVersionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		const button = wrapper.find('[data-testid="publish-agent-button"]');
		expect(button.text()).toContain('agents.publish.button.published');
		expect(button.attributes('disabled')).toBeDefined();
	});

	it('shows "Publish" and is enabled when there are unpublished changes', async () => {
		const agent = createAgent({ versionId: 'v2', activeVersionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		const button = wrapper.find('[data-testid="publish-agent-button"]');
		expect(button.text()).toContain('agents.publish.button.publish');
		expect(button.attributes('disabled')).toBeUndefined();
	});

	// Publish button click
	it('calls publishAgent and emits published when Publish is clicked', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const updatedAgent = createAgent({ activeVersionId: 'v1', publishedVersion });
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);

		const agent = createAgent({ publishedVersion: null, activeVersionId: null });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		expect(publishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('published')?.[0]).toEqual([updatedAgent]);
	});

	it('calls publishAgent and emits published when republishing with pending changes', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const updatedAgent = createAgent({ versionId: 'v2', activeVersionId: 'v2', publishedVersion });
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);

		const agent = createAgent({ versionId: 'v2', activeVersionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		expect(publishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('published')?.[0]).toEqual([updatedAgent]);
	});

	it('does nothing when the disabled Published button is clicked', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');

		const agent = createAgent({ versionId: 'v1', activeVersionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		expect(publishAgent).not.toHaveBeenCalled();
	});

	// Dropdown — publish action
	it('calls publishAgent via dropdown Publish action', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const updatedAgent = createAgent({ activeVersionId: 'v1', publishedVersion });
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);

		const agent = createAgent({ publishedVersion: null, activeVersionId: null });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="publish"]').trigger('click');
		await flushPromises();

		expect(publishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('published')?.[0]).toEqual([updatedAgent]);
	});

	// Dropdown — unpublish action
	it('calls unpublishAgent and emits unpublished on confirmed unpublish', async () => {
		const { unpublishAgent } = await import('../composables/useAgentApi');
		const { useMessage } = await import('@/app/composables/useMessage');
		const unpublishedAgent = createAgent({ activeVersionId: null, publishedVersion: null });
		vi.mocked(unpublishAgent).mockResolvedValue(unpublishedAgent);

		const agent = createAgent({ versionId: 'v1', activeVersionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="unpublish"]').trigger('click');
		await flushPromises();

		expect(useMessage().confirm).toHaveBeenCalled();
		expect(unpublishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('unpublished')?.[0]).toEqual([unpublishedAgent]);
	});

	it('does not unpublish when confirm modal is cancelled', async () => {
		const { unpublishAgent } = await import('../composables/useAgentApi');
		const { useMessage } = await import('@/app/composables/useMessage');
		vi.mocked(useMessage().confirm).mockResolvedValueOnce(MODAL_CANCEL);

		const agent = createAgent({ versionId: 'v1', activeVersionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="unpublish"]').trigger('click');
		await flushPromises();

		expect(unpublishAgent).not.toHaveBeenCalled();
		expect(wrapper.emitted('unpublished')).toBeUndefined();
	});
});
