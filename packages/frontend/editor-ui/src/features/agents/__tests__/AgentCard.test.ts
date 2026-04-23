/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, async stubs, and any-based mock reads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { AgentResource } from '../types';
import type { AgentPublishedVersion } from '../agent.types';

vi.mock('../composables/useAgentApi', () => ({
	publishAgent: vi.fn(),
	unpublishAgent: vi.fn(),
	deleteAgent: vi.fn(),
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({
		trackPublishedAgent: vi.fn(),
		trackUnpublishedAgent: vi.fn(),
	}),
}));

vi.mock('../composables/agentTelemetry.utils', () => ({
	buildAgentConfigFingerprint: vi.fn().mockResolvedValue({ config_version: 'v-test' }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				return Object.entries(opts.interpolate).reduce(
					(acc, [k, v]) => acc.replace(`{${k}}`, v),
					key,
				);
			}
			return key;
		},
	}),
}));

vi.mock('@/app/composables/useToast', () => {
	const showMessage = vi.fn();
	return { useToast: () => ({ showMessage }) };
});

const openModalWithDataMock = vi.fn();
const closeModalMock = vi.fn();

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: openModalWithDataMock,
		closeModal: closeModalMock,
	}),
}));

const STUBS = {
	N8nCard: {
		template:
			'<div @click="$emit(\'click\')"><slot name="header" /><slot /><slot name="append" /></div>',
		props: ['hoverable'],
		emits: ['click'],
	},
	N8nText: {
		template: '<span v-bind="$attrs"><slot /></span>',
		props: ['tag', 'bold', 'size', 'color'],
	},
	// N8nActionDropdown has no defineOptions name, Vue infers it as 'ActionDropdown' from filename
	ActionDropdown: {
		name: 'ActionDropdown',
		template:
			'<div><button v-for="item in items" :key="item.id" :data-action="item.id" :disabled="item.disabled || undefined" @click.stop="$emit(\'select\', item.id)">{{ item.label }}</button></div>',
		props: ['items', 'activatorIcon'],
		emits: ['select'],
	},
};

const publishedVersion: AgentPublishedVersion = {
	schema: null,
	publishedFromVersionId: 'v1',
	model: null,
	provider: null,
	credentialId: null,
	publishedById: null,
};

function createAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		resourceType: 'agent',
		id: 'agent-1',
		name: 'My Agent',
		description: 'An agent description',
		projectId: 'project-1',
		credentialId: null,
		provider: null,
		model: null,
		isCompiled: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-02T00:00:00Z',
		versionId: 'v1',
		tools: {},
		publishedVersion: null,
		...overrides,
	};
}

interface RenderProps {
	agent?: AgentResource;
	projectId?: string;
}

function getModalCallbacks() {
	const data = openModalWithDataMock.mock.lastCall?.[0]?.data as {
		onConfirm: () => Promise<void> | void;
		onCancel: () => Promise<void> | void;
	};

	return data;
}

describe('AgentCard', () => {
	async function renderComponent(props: RenderProps = {}) {
		const { default: AgentCard } = await import('../components/AgentCard.vue');
		return mount(AgentCard, {
			props: {
				agent: createAgent(),
				projectId: 'project-1',
				...props,
			},
			global: { stubs: STUBS },
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Rendering
	it('renders the agent name', async () => {
		const wrapper = await renderComponent({ agent: createAgent({ name: 'My Agent' }) });
		expect(wrapper.text()).toContain('My Agent');
	});

	it('renders the agent description', async () => {
		const wrapper = await renderComponent({ agent: createAgent({ description: 'Great agent' }) });
		expect(wrapper.text()).toContain('Great agent');
	});

	it('renders fallback key when description is null', async () => {
		const wrapper = await renderComponent({ agent: createAgent({ description: null }) });
		expect(wrapper.text()).toContain('agents.list.noDescription');
	});

	// Published badge
	it('shows published badge when latest version is published', async () => {
		const agent = createAgent({ versionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		expect(wrapper.find('[data-testid="agent-published-indicator"]').exists()).toBe(true);
	});

	it('hides published badge when agent has never been published', async () => {
		const agent = createAgent({ publishedVersion: null });
		const wrapper = await renderComponent({ agent });
		expect(wrapper.find('[data-testid="agent-published-indicator"]').exists()).toBe(false);
	});

	it('shows published badge when published with newer draft changes', async () => {
		const agent = createAgent({ versionId: 'v2', publishedVersion });
		const wrapper = await renderComponent({ agent });
		expect(wrapper.find('[data-testid="agent-published-indicator"]').exists()).toBe(true);
	});

	// Context menu actions
	it('shows Publish action when agent is not published', async () => {
		const agent = createAgent({ publishedVersion: null });
		const wrapper = await renderComponent({ agent });
		expect(wrapper.find('[data-action="publish"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(false);
	});

	it('shows Unpublish action when latest version is published', async () => {
		const agent = createAgent({ versionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="publish"]').exists()).toBe(false);
	});

	it('shows Unpublish action when published with newer draft changes', async () => {
		const agent = createAgent({ versionId: 'v2', publishedVersion });
		const wrapper = await renderComponent({ agent });
		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="publish"]').exists()).toBe(false);
	});

	it('always shows Delete action', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-action="delete"]').exists()).toBe(true);
	});

	// Card click
	it('emits select with agent id when card is clicked', async () => {
		const agent = createAgent({ id: 'agent-42' });
		const wrapper = await renderComponent({ agent });
		// data-testid="agent-card" is on the N8nCard component in the template and falls through to the stub root
		await wrapper.find('[data-testid="agent-card"]').trigger('click');
		expect(wrapper.emitted('select')?.[0]).toEqual(['agent-42']);
	});

	// Publish action
	it('calls publishAgent and emits published on publish', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const updatedAgent = createAgent({ publishedVersion });
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);

		const agent = createAgent({ publishedVersion: null });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="publish"]').trigger('click');
		await flushPromises();

		expect(publishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('published')?.[0]).toEqual([updatedAgent]);
	});

	// Unpublish action
	it('calls unpublishAgent and emits unpublished on confirmed unpublish', async () => {
		const { unpublishAgent } = await import('../composables/useAgentApi');
		const unpublishedAgent = createAgent({ publishedVersion: null });
		vi.mocked(unpublishAgent).mockResolvedValue(unpublishedAgent);

		const agent = createAgent({ versionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="unpublish"]').trigger('click');
		await getModalCallbacks().onConfirm();
		await flushPromises();

		expect(openModalWithDataMock).toHaveBeenCalled();
		expect(unpublishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('unpublished')?.[0]).toEqual([unpublishedAgent]);
	});

	it('does not unpublish when confirm modal is cancelled', async () => {
		const { unpublishAgent } = await import('../composables/useAgentApi');

		const agent = createAgent({ versionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="unpublish"]').trigger('click');
		await getModalCallbacks().onCancel();
		await flushPromises();

		expect(unpublishAgent).not.toHaveBeenCalled();
		expect(wrapper.emitted('unpublished')).toBeUndefined();
	});

	// Delete action
	it('calls deleteAgent and emits deleted on confirmed delete', async () => {
		const { deleteAgent } = await import('../composables/useAgentApi');
		vi.mocked(deleteAgent).mockResolvedValue(undefined);

		const agent = createAgent({ id: 'agent-42' });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="delete"]').trigger('click');
		await getModalCallbacks().onConfirm();
		await flushPromises();

		expect(deleteAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-42');
		expect(wrapper.emitted('deleted')?.[0]).toEqual(['agent-42']);
	});

	it('does not delete when confirm modal is cancelled', async () => {
		const { deleteAgent } = await import('../composables/useAgentApi');

		const wrapper = await renderComponent();
		await wrapper.find('[data-action="delete"]').trigger('click');
		await getModalCallbacks().onCancel();
		await flushPromises();

		expect(deleteAgent).not.toHaveBeenCalled();
		expect(wrapper.emitted('deleted')).toBeUndefined();
	});
});
