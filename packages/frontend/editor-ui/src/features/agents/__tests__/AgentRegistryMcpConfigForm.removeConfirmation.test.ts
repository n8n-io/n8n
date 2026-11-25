import { fireEvent, waitFor, within } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref, type PropType } from 'vue';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import { createComponentRenderer } from '@/__tests__/render';
import ModalRoot from '@/app/components/ModalRoot.vue';
import AgentConfirmationModal from '@/features/agents/components/AgentConfirmationModal.vue';
import AgentRegistryMcpConfigForm from '@/features/agents/components/AgentRegistryMcpConfigForm.vue';
import type { AgentRegistryMcpModalData } from '@/features/agents/composables/useAgentRegistryMcpConfig';
import { AGENT_CONFIRMATION_MODAL_KEY } from '@/features/agents/constants';
import type { McpServerConnectionItem } from '@/features/shared/toolsConnection/types';

import { AgentModalTestStub } from './utils/AgentModalTestStub';

const useAgentRegistryMcpConfigMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/agents/composables/useAgentRegistryMcpConfig', () => ({
	MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS: 1_000,
	DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS: 60_000,
	MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS: 120_000,
	useAgentRegistryMcpConfig: useAgentRegistryMcpConfigMock,
}));

const notionItem: McpServerConnectionItem = {
	id: 'registry-config:notion',
	kind: 'mcp-server',
	title: 'Notion',
	status: 'connected',
	availableTools: [],
	settings: {
		categories: { read: 'always_allow', write: 'require_approval' },
		connectionTimeoutMs: 60_000,
	},
};

const RemoveConfirmationHarness = defineComponent({
	components: {
		AgentConfirmationModal,
		AgentRegistryMcpConfigForm,
		ModalRoot,
	},
	props: {
		data: {
			type: Object as PropType<AgentRegistryMcpModalData>,
			required: true,
		},
		onRemoveResolved: {
			type: Function as PropType<(removed: boolean) => void>,
			required: true,
		},
	},
	setup(props) {
		const formRef = ref<{ remove(): Promise<boolean> } | null>(null);

		async function triggerRemove() {
			const removed = (await formRef.value?.remove()) ?? false;
			props.onRemoveResolved(removed);
		}

		return {
			AGENT_CONFIRMATION_MODAL_KEY,
			formRef,
			triggerRemove,
		};
	},
	template: `
		<div>
			<AgentRegistryMcpConfigForm ref="formRef" :data="data" />
			<button type="button" data-test-id="trigger-remove-tool" @click="triggerRemove">
				Remove
			</button>
			<ModalRoot :name="AGENT_CONFIRMATION_MODAL_KEY">
				<template #default="{ modalName, data: modalData }">
					<AgentConfirmationModal :modal-name="modalName" :data="modalData" />
				</template>
			</ModalRoot>
		</div>
	`,
});

const renderHarness = createComponentRenderer(RemoveConfirmationHarness, {
	global: {
		stubs: {
			AgentModal: AgentModalTestStub,
			McpConnectionStatusCallout: true,
			McpDetailBody: true,
			McpToolPermissionsEditor: true,
		},
	},
});

function setupHarness() {
	const pinia = createPinia();
	setActivePinia(pinia);

	const onRemove = vi.fn();
	const onRemoveResolved = vi.fn();

	useAgentRegistryMcpConfigMock.mockReturnValue({
		item: ref(notionItem),
		title: ref('Notion'),
		save: vi.fn().mockReturnValue(true),
		changeTitle: vi.fn(),
		credentialAdapter: {},
		selectCredential: vi.fn(),
		discover: vi.fn(),
	});

	const data: AgentRegistryMcpModalData = {
		kind: 'registryMcpServer',
		projectId: 'project-1',
		mcpServer: {
			name: 'Notion',
			authentication: 'notionMcpOAuth2Api',
			credential: 'credential-1',
			metadata: { nodeTypeName: '@n8n/mcp-registry.notion' },
		},
		onConfirm: vi.fn(),
		onRemove,
	};

	const renderResult = renderHarness({
		pinia,
		props: { data, onRemoveResolved },
	});

	return { ...renderResult, onRemove, onRemoveResolved };
}

describe('AgentRegistryMcpConfigForm remove confirmation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		modalRegistry.clear();
		modalRegistry.register({
			key: AGENT_CONFIRMATION_MODAL_KEY,
			component: AgentConfirmationModal,
			initialState: { open: false },
		});
	});

	afterEach(() => {
		modalRegistry.clear();
	});

	it('confirms tool removal through the confirmation modal', async () => {
		const { getByTestId, findByRole, queryByRole, onRemove, onRemoveResolved } = setupHarness();

		await fireEvent.click(getByTestId('trigger-remove-tool'));

		const dialog = await findByRole('dialog');
		expect(within(dialog).getByRole('heading', { name: 'Remove Notion?' })).toBeInTheDocument();

		await fireEvent.click(within(dialog).getByRole('button', { name: 'Remove tool' }));

		await waitFor(() => {
			expect(onRemove).toHaveBeenCalledOnce();
			expect(onRemoveResolved).toHaveBeenCalledWith(true);
			expect(queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	it('keeps the tool when removal is cancelled in the confirmation modal', async () => {
		const { getByTestId, findByRole, queryByRole, onRemove, onRemoveResolved } = setupHarness();

		await fireEvent.click(getByTestId('trigger-remove-tool'));

		const dialog = await findByRole('dialog');
		await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

		await waitFor(() => {
			expect(onRemove).not.toHaveBeenCalled();
			expect(onRemoveResolved).toHaveBeenCalledWith(false);
			expect(queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	// AGENT-1667: The confirmation must render the notice with emphasis, not literal tags.
	it('renders the credential notice in bold without raw HTML tags', async () => {
		const { getByTestId, findByRole } = setupHarness();

		await fireEvent.click(getByTestId('trigger-remove-tool'));

		const dialog = await findByRole('dialog');
		const body = dialog.querySelector('main');
		expect(body).not.toBeNull();

		const bodyText = body?.textContent ?? '';
		expect(bodyText).not.toMatch(/<\/?strong>/i);
		expect(bodyText.replace(/\s+/g, ' ')).toContain(
			"This removes the tool and the permissions you've set. Your Notion credential stays saved for reuse.",
		);
		expect(body?.querySelector('strong')).toHaveTextContent(
			'Your Notion credential stays saved for reuse.',
		);
	});
});
