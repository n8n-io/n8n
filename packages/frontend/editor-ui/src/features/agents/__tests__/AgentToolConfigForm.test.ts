import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import type { INode } from 'n8n-workflow';
import type { AgentToolGuardrailConfig } from '@n8n/api-types';
import { defineComponent, onMounted } from 'vue';

import AgentToolConfigForm, {
	type AgentToolConfigModalData,
} from '../components/AgentToolConfigForm.vue';

const credentialListeners = vi.hoisted(() => ({
	onDeleted: undefined as ((credentialId: string) => void) | undefined,
}));

vi.mock('@/features/credentials/credentials.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/credentials/credentials.store')>()),
	listenForCredentialChanges: ({
		onCredentialDeleted,
	}: {
		onCredentialDeleted?: (credentialId: string) => void;
	}) => {
		credentialListeners.onDeleted = onCredentialDeleted;
	},
}));

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const initialNode: INode = {
	id: 'mcp-node',
	name: 'github',
	type: '@n8n/n8n-nodes-langchain.mcpClientTool',
	typeVersion: 1.2,
	parameters: {
		endpointUrl: 'https://mcp.example.test',
		serverTransport: 'httpStreamable',
		authentication: 'bearerAuth',
		options: { timeout: 60_000 },
	},
	credentials: {
		httpBearerAuth: { id: 'credential-1', name: 'MCP token' },
	},
	position: [0, 0],
};

const NodeContentStub = defineComponent({
	props: ['initialNode'],
	emits: ['update:valid', 'update:node-name', 'update:node'],
	setup(props, { emit, expose }) {
		expose({ getNode: () => props.initialNode as INode });
		onMounted(() => {
			emit('update:valid', true);
			emit('update:node-name', (props.initialNode as INode).name);
			emit('update:node', props.initialNode);
		});
		return {};
	},
	template: '<div />',
});

function renderForm(data: AgentToolConfigModalData) {
	return mount(AgentToolConfigForm, {
		props: { data },
		global: {
			plugins: [createTestingPinia({ stubActions: false })],
			stubs: {
				AgentToolConfigNodeContent: NodeContentStub,
				AgentToolConfigMcpApprovalSetting: true,
			},
		},
	});
}

function confirm(wrapper: ReturnType<typeof renderForm>): boolean {
	return (wrapper.vm as unknown as { confirm: () => boolean }).confirm();
}

describe('AgentToolConfigForm MCP configuration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialListeners.onDeleted = undefined;
	});

	it('uses permissive permissions when an MCP server has no saved policy', async () => {
		const onConfirm = vi.fn();
		const wrapper = renderForm({
			kind: 'mcpServer',
			mcpServer: {
				name: 'github',
				url: 'https://mcp.example.test',
				transport: 'streamableHttp',
				authentication: 'bearerAuth',
			},
			initialNode,
			onConfirm,
		});
		await flushPromises();

		expect(confirm(wrapper)).toBe(true);
		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				toolPermissions: {
					categories: { read: 'always_allow', write: 'always_allow' },
				},
			}),
		);
	});

	it('removes approval requirements when the host does not support approval', async () => {
		const onConfirm = vi.fn();
		const wrapper = renderForm({
			kind: 'mcpServer',
			mcpServer: {
				name: 'github',
				url: 'https://mcp.example.test',
				transport: 'streamableHttp',
				authentication: 'bearerAuth',
				toolPermissions: {
					categories: { read: 'blocked', write: 'require_approval' },
					tools: { search: 'blocked', update: 'require_approval' },
				},
			},
			initialNode,
			supportsToolApproval: false,
			onConfirm,
		});
		await flushPromises();

		expect(confirm(wrapper)).toBe(true);
		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				toolPermissions: {
					categories: { read: 'always_allow', write: 'always_allow' },
				},
			}),
		);
	});

	it('removes the MCP server when its credential is deleted', async () => {
		const onRemove = vi.fn();
		const wrapper = renderForm({
			kind: 'mcpServer',
			mcpServer: {
				name: 'github',
				url: 'https://mcp.example.test',
				transport: 'streamableHttp',
				authentication: 'bearerAuth',
				credential: 'credential-1',
			},
			initialNode,
			onConfirm: vi.fn(),
			onRemove,
		});
		await flushPromises();

		credentialListeners.onDeleted?.('credential-1');

		expect(onRemove).toHaveBeenCalledOnce();
		expect(wrapper.emitted('credential-deleted')).toEqual([[]]);
	});
});

describe('AgentToolConfigForm guardrails', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards an open-guardrail request from the section', async () => {
		const savedGuardrail = {
			kind: 'keywords',
			id: 'g1',
			stage: 'before',
			keywords: ['secret'],
			tools: [{ type: 'node', name: 'Slack' }],
		} satisfies AgentToolGuardrailConfig;
		const wrapper = renderForm({
			toolRef: {
				type: 'node',
				name: 'Slack',
				node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1, nodeParameters: {} },
			},
			onConfirm: vi.fn(),
			onRemove: vi.fn(),
			guardrails: {
				getGuardrails: () => [savedGuardrail],
				getTools: () => [],
				onUpdateGuardrails: vi.fn(),
			},
		});
		await flushPromises();

		const chip = wrapper.find('[data-testid="agent-tool-guardrails-chip"]');
		expect(chip.exists()).toBe(true);
		await chip.trigger('click');

		expect(wrapper.emitted('open-guardrail')).toEqual([[{ guardrail: savedGuardrail }]]);
	});
});
