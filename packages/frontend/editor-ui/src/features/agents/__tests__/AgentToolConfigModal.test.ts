import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { fireEvent, waitFor } from '@testing-library/vue';
import { defineComponent, onMounted, ref, nextTick } from 'vue';

import AgentToolConfigModal from '../components/AgentToolConfigModal.vue';
import type { AgentJsonToolRef, CustomToolEntry } from '../types';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => key,
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn(() => ({ href: '' })) }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

vi.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

function createToolSettingsStub(emitValid: boolean) {
	return defineComponent({
		props: ['initialNode', 'existingToolNames', 'projectId'],
		emits: ['update:valid', 'update:node-name'],
		setup(props, { emit, expose }) {
			// Expose what the modal reads from ref(...). The stub carries through
			// the initialNode's credentials so we can assert the round-trip keeps them.
			expose({
				node: ref({
					id: 'mocked-uuid',
					name: props.initialNode?.name ?? '',
					type: props.initialNode?.type ?? '',
					typeVersion: props.initialNode?.typeVersion ?? 1,
					parameters: { edited: true },
					credentials: props.initialNode?.credentials,
					position: [0, 0],
				}),
				handleChangeName: vi.fn(),
				nodeTypeDescription: ref({ name: 'n8n-nodes-base.slack', displayName: 'Slack' }),
			});
			onMounted(() => {
				emit('update:valid', emitValid);
				emit('update:node-name', props.initialNode?.name ?? '');
			});
			return {};
		},
		template: '<div data-test-id="node-tool-settings-content" :data-project-id="projectId" />',
	});
}

function createWorkflowToolConfigStub(emitValid: boolean) {
	return defineComponent({
		props: ['initialRef'],
		emits: ['update:valid', 'update:node-name'],
		setup(props, { emit, expose }) {
			expose({
				name: ref(props.initialRef?.name ?? ''),
				description: ref(props.initialRef?.description ?? ''),
				allOutputs: ref(props.initialRef?.allOutputs ?? false),
				handleChangeName: vi.fn(),
			});
			onMounted(() => {
				emit('update:valid', emitValid);
				emit('update:node-name', props.initialRef?.name ?? '');
			});
			return {};
		},
		template: '<div data-test-id="workflow-tool-config-content" />',
	});
}

const ElDialogStub = {
	template: `
		<div role="dialog">
			<slot name="header" />
			<slot />
			<slot name="footer" />
		</div>
	`,
	props: [
		'modelValue',
		'beforeClose',
		'class',
		'center',
		'width',
		'showClose',
		'closeOnClickModal',
		'closeOnPressEscape',
		'style',
		'appendTo',
		'lockScroll',
		'appendToBody',
		'dataTestId',
		'modalClass',
		'zIndex',
	],
};

const MODAL_NAME = 'AgentToolConfigModal';

function toolRef(overrides: Partial<AgentJsonToolRef['node']> = {}): AgentJsonToolRef {
	return {
		type: 'node',
		name: 'Slack',
		description: 'Send messages to Slack',
		node: {
			nodeType: 'n8n-nodes-base.slack',
			nodeTypeVersion: 1,
			nodeParameters: { channel: 'general' },
			credentials: { slackApi: { id: 'cred-1', name: 'Prod Slack' } },
			...overrides,
		},
	};
}

function renderModal({
	valid = false,
	onConfirm = vi.fn(),
	ref = toolRef(),
	customTool,
	projectId,
	agentId,
}: {
	valid?: boolean;
	onConfirm?: (updated: AgentJsonToolRef) => void;
	ref?: AgentJsonToolRef;
	customTool?: CustomToolEntry;
	projectId?: string;
	agentId?: string;
} = {}) {
	const renderComponent = createComponentRenderer(AgentToolConfigModal, {
		global: {
			stubs: {
				ElDialog: ElDialogStub,
				NodeIcon: { template: '<div data-test-id="header-node-icon" />' },
				NodeToolSettingsContent: createToolSettingsStub(valid),
				WorkflowToolConfigContent: createWorkflowToolConfigStub(valid),
				AgentCustomToolViewer: {
					props: ['code'],
					template: '<pre data-test-id="agent-custom-tool-viewer">{{ code }}</pre>',
				},
			},
		},
	});
	return renderComponent({
		props: {
			modalName: MODAL_NAME,
			data: { toolRef: ref, customTool, existingToolNames: [], projectId, agentId, onConfirm },
		},
	});
}

describe('AgentToolConfigModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	it('renders the shared node-tool settings content', () => {
		const { getByTestId } = renderModal();
		expect(getByTestId('node-tool-settings-content')).toBeTruthy();
	});

	it('passes agent project context to the node-tool settings content', () => {
		const { getByTestId } = renderModal({ projectId: 'project-1', agentId: 'agent-1' });

		const settings = getByTestId('node-tool-settings-content');
		expect(settings.getAttribute('data-project-id')).toBe('project-1');
	});

	it('does not render the removed Configure / Permissions outer tabs', () => {
		// The stubbed Permissions tab (and its sibling "Configure" tab label) were
		// dropped — the modal renders the content form directly now.
		const { queryByText, queryByTestId } = renderModal();
		expect(queryByText('agents.toolConfig.tabs.configure')).toBeNull();
		expect(queryByText('agents.toolConfig.tabs.permissions')).toBeNull();
		expect(queryByTestId('agent-tool-config-permissions-tab')).toBeNull();
	});

	it('disables Save until the content emits valid=true', async () => {
		const { getByTestId } = renderModal({ valid: false });
		await nextTick();
		const saveBtn = getByTestId('agent-tool-config-save') as HTMLButtonElement;
		expect(saveBtn.disabled).toBe(true);
	});

	it('enables Save once valid and round-trips the node back into the toolRef on confirm', async () => {
		const onConfirm = vi.fn();
		const initial = toolRef();
		const { getByTestId } = renderModal({ valid: true, onConfirm, ref: initial });

		await waitFor(() => {
			const saveBtn = getByTestId('agent-tool-config-save') as HTMLButtonElement;
			expect(saveBtn.disabled).toBe(false);
		});

		await fireEvent.click(getByTestId('agent-tool-config-save'));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		const [updated] = onConfirm.mock.calls[0];
		// Preserved fields from the original ref
		expect(updated.type).toBe('node');
		expect(updated.description).toBe(initial.description);
		expect(updated).not.toHaveProperty('inputSchema');
		// Fields merged from the edited INode
		expect(updated.node.nodeParameters).toEqual({ edited: true });
		expect(updated.node.credentials).toEqual({ slackApi: { id: 'cred-1', name: 'Prod Slack' } });
	});

	it('closes the modal on Cancel without calling onConfirm', async () => {
		const onConfirm = vi.fn();
		const { getAllByRole } = renderModal({ valid: true, onConfirm });

		const buttons = getAllByRole('button');
		const cancelBtn = buttons.find((b) => b.textContent?.includes('agents.toolConfig.cancel'));
		expect(cancelBtn).toBeTruthy();
		await fireEvent.click(cancelBtn!);

		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('renders the custom tool TypeScript viewer for custom refs', () => {
		const customTool: CustomToolEntry = {
			code: 'export async function run() {\n\treturn "ok";\n}',
			descriptor: {
				name: 'Lookup customer',
				description: 'Finds a customer',
				systemInstruction: null,
				inputSchema: null,
				outputSchema: null,
				hasSuspend: false,
				hasResume: false,
				hasToMessage: false,
				requireApproval: false,
				providerOptions: null,
			},
		};

		const { getByTestId, queryByTestId } = renderModal({
			ref: { type: 'custom', id: 'custom-tool-1' },
			customTool,
		});
		expect(getByTestId('agent-custom-tool-viewer').textContent).toContain(customTool.code);
		expect(queryByTestId('node-tool-settings-content')).toBeNull();
		expect(queryByTestId('workflow-tool-config-content')).toBeNull();
		expect(queryByTestId('agent-tool-config-save')).toBeNull();
	});

	it('renders the workflow-tool config content for workflow refs', () => {
		const { getByTestId, queryByTestId } = renderModal({
			ref: {
				type: 'workflow',
				workflow: 'w-1',
				name: 'My Workflow Tool',
				description: 'Does something',
			},
		});
		expect(getByTestId('workflow-tool-config-content')).toBeTruthy();
		expect(queryByTestId('node-tool-settings-content')).toBeNull();
	});
});
