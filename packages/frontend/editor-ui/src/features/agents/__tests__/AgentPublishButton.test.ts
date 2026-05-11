/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, async stubs, and any-based mock reads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { AgentResource } from '../types';
import type { AgentPublishedVersion } from '../agent.types';

vi.mock('../composables/useAgentApi', () => ({
	publishAgent: vi.fn(),
	unpublishAgent: vi.fn(),
	revertAgentToPublished: vi.fn(),
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
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return { useToast: () => ({ showMessage, showError }) };
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
	skills: null,
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
		description: null,
		projectId: 'project-1',
		credentialId: null,
		provider: null,
		model: null,
		isCompiled: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		versionId: 'v1',
		tools: {},
		skills: {},
		publishedVersion: null,
		...overrides,
	};
}

interface RenderProps {
	agent?: AgentResource | null;
	projectId?: string;
	agentId?: string;
	beforeRevertToPublished?: () => Promise<void> | void;
}

function getModalCallbacks() {
	const data = openModalWithDataMock.mock.lastCall?.[0]?.data as {
		onConfirm: () => Promise<void> | void;
		onCancel: () => Promise<void> | void;
	};

	return data;
}

// First mount eats the SFC transform cost for AgentPublishButton + deps,
// which has crept above the default 5 s budget on slower CI workers. Give
// the suite headroom; subsequent tests hit the cached module and finish fast.
vi.setConfig({ testTimeout: 30_000 });

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
		const agent = createAgent({ publishedVersion: null });
		const wrapper = await renderComponent({ agent });
		const button = wrapper.find('[data-testid="publish-agent-button"]');
		expect(button.text()).toContain('agents.publish.button.publish');
		expect(button.attributes('disabled')).toBeUndefined();
	});

	it('shows "Published" and is disabled when latest version is published', async () => {
		const agent = createAgent({ versionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		const button = wrapper.find('[data-testid="publish-agent-button"]');
		expect(button.text()).toContain('agents.publish.button.published');
		expect(button.attributes('disabled')).toBeDefined();
	});

	it('shows "Publish" and is enabled when there are unpublished changes', async () => {
		const agent = createAgent({ versionId: 'v2', publishedVersion });
		const wrapper = await renderComponent({ agent });
		const button = wrapper.find('[data-testid="publish-agent-button"]');
		expect(button.text()).toContain('agents.publish.button.publish');
		expect(button.attributes('disabled')).toBeUndefined();
	});

	// Publish button click
	it('calls publishAgent and emits published when Publish is clicked', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const updatedAgent = createAgent({ publishedVersion });
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);

		const agent = createAgent({ publishedVersion: null });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		expect(publishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('published')?.[0]).toEqual([updatedAgent]);
	});

	it('calls publishAgent and emits published when republishing with pending changes', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const updatedAgent = createAgent({
			versionId: 'v2',
			publishedVersion: { ...publishedVersion, publishedFromVersionId: 'v2' },
		});
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);

		const agent = createAgent({ versionId: 'v2', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		expect(publishAgent).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('published')?.[0]).toEqual([updatedAgent]);
	});

	it('does nothing when the disabled Published button is clicked', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');

		const agent = createAgent({ versionId: 'v1', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		expect(publishAgent).not.toHaveBeenCalled();
	});

	it('computes config_version from the server-returned publishedVersion.schema, not caller context', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const { buildAgentConfigFingerprint } = await import('../composables/agentTelemetry.utils');

		// Server returns the just-published config in publishedVersion.schema.
		const publishedSchema = { name: 'X', instructions: 'pub', model: 'gpt-4' } as unknown as Record<
			string,
			unknown
		>;
		const updatedAgent = createAgent({
			publishedVersion: { ...publishedVersion, schema: publishedSchema as never },
		});
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);

		// Caller has no live draft available — mirrors the list-card publish path.
		const agent = createAgent({ publishedVersion: null });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		// Fingerprint must be derived from the server's response so different
		// agents never collide on `config_version`.
		expect(buildAgentConfigFingerprint).toHaveBeenCalledWith(publishedSchema, []);
	});

	it('treats publish as successful when telemetry fingerprinting throws', async () => {
		const { publishAgent } = await import('../composables/useAgentApi');
		const { buildAgentConfigFingerprint } = await import('../composables/agentTelemetry.utils');
		const { useToast } = await import('@/app/composables/useToast');
		const updatedAgent = createAgent({ publishedVersion });
		vi.mocked(publishAgent).mockResolvedValue(updatedAgent);
		vi.mocked(buildAgentConfigFingerprint).mockRejectedValueOnce(
			new Error('crypto.subtle unavailable'),
		);

		const agent = createAgent({ publishedVersion: null });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-testid="publish-agent-button"]').trigger('click');
		await flushPromises();

		// Success path ran all the way through — no error toast, published event emitted.
		const toast = useToast();
		expect(toast.showError).not.toHaveBeenCalled();
		expect(toast.showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(wrapper.emitted('published')?.[0]).toEqual([updatedAgent]);
	});

	// Dropdown — publish action
	it('calls publishAgent via dropdown Publish action', async () => {
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

	it('calls revertAgentToPublished and emits reverted from the dropdown action', async () => {
		const { revertAgentToPublished } = await import('../composables/useAgentApi');
		const beforeRevertToPublished = vi.fn();
		const updatedAgent = createAgent({
			versionId: 'v1',
			publishedVersion,
		});
		vi.mocked(revertAgentToPublished).mockResolvedValue(updatedAgent);

		const agent = createAgent({ versionId: 'v2', publishedVersion });
		const wrapper = await renderComponent({ agent, beforeRevertToPublished });
		await wrapper.find('[data-action="revert-to-published"]').trigger('click');
		await getModalCallbacks().onConfirm();
		await flushPromises();

		expect(beforeRevertToPublished).toHaveBeenCalled();
		expect(revertAgentToPublished).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.emitted('reverted')?.[0]).toEqual([updatedAgent]);
	});

	it('does not show the revert action when the agent is not published', async () => {
		const wrapper = await renderComponent({ agent: createAgent({ publishedVersion: null }) });

		expect(wrapper.find('[data-action="revert-to-published"]').exists()).toBe(false);
	});

	it('does not revert when the confirmation modal is cancelled', async () => {
		const { revertAgentToPublished } = await import('../composables/useAgentApi');

		const agent = createAgent({ versionId: 'v2', publishedVersion });
		const wrapper = await renderComponent({ agent });
		await wrapper.find('[data-action="revert-to-published"]').trigger('click');
		await getModalCallbacks().onCancel();
		await flushPromises();

		expect(revertAgentToPublished).not.toHaveBeenCalled();
		expect(wrapper.emitted('reverted')).toBeUndefined();
	});

	// Dropdown — unpublish action
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

	// Indicator dot styling — guards against regressions like
	// using subtle text-color tokens that render an invisible dot.
	describe('indicator dot', () => {
		it('does not render the indicator when the agent is not published', async () => {
			const wrapper = await renderComponent({
				agent: createAgent({ publishedVersion: null }),
			});
			const button = wrapper.find('[data-testid="publish-agent-button"]');
			expect(button.find('span[class*="indicatorDot"]').exists()).toBe(false);
		});

		it('renders the published indicator when latest version is published', async () => {
			const wrapper = await renderComponent({
				agent: createAgent({ versionId: 'v1', publishedVersion }),
			});
			const dot = wrapper.find('[data-testid="publish-agent-button"] span[class*="indicatorDot"]');
			expect(dot.exists()).toBe(true);
			expect(dot.classes().some((c) => c.includes('indicatorPublished'))).toBe(true);
			expect(dot.classes().some((c) => c.includes('indicatorChanges'))).toBe(false);
		});

		it('renders the changes indicator when there are unpublished changes', async () => {
			const wrapper = await renderComponent({
				agent: createAgent({ versionId: 'v2', publishedVersion }),
			});
			const dot = wrapper.find('[data-testid="publish-agent-button"] span[class*="indicatorDot"]');
			expect(dot.exists()).toBe(true);
			expect(dot.classes().some((c) => c.includes('indicatorChanges'))).toBe(true);
			expect(dot.classes().some((c) => c.includes('indicatorPublished'))).toBe(false);
		});
	});
});
