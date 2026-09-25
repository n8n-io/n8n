import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	McpServerConnectionItem,
	McpToolSettings,
} from '@/features/shared/toolsConnection/types';

import AgentRegistryMcpConfigForm from '../components/AgentRegistryMcpConfigForm.vue';
import type { AgentRegistryMcpModalData } from '../composables/useAgentRegistryMcpConfig';

const saveMock = vi.hoisted(() => vi.fn());
const useAgentRegistryMcpConfigMock = vi.hoisted(() => vi.fn());

vi.mock('../composables/useAgentRegistryMcpConfig', () => ({
	MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS: 1,
	DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS: 60_000,
	MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS: 120_000,
	useAgentRegistryMcpConfig: useAgentRegistryMcpConfigMock,
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n };
});

vi.mock('@n8n/design-system', () => ({
	N8nInput: defineComponent({
		inheritAttrs: false,
		props: {
			modelValue: { type: [String, Number], default: '' },
			type: { type: String, default: 'text' },
			disabled: Boolean,
			min: Number,
			max: Number,
			step: Number,
		},
		emits: ['update:modelValue'],
		template: `
			<div>
				<input
					v-bind="$attrs"
					:type="type"
					:value="modelValue"
					:disabled="disabled"
					:min="min"
					:max="max"
					:step="step"
					@input="$emit('update:modelValue', $event.target.value)"
				/>
				<slot name="suffix" />
			</div>
		`,
	}),
	N8nSpinner: defineComponent({ template: '<span />' }),
	N8nText: defineComponent({
		props: { tag: { type: String, default: 'span' } },
		template: '<component :is="tag"><slot /></component>',
	}),
}));

const permissions: McpToolSettings = {
	categories: { read: 'always_allow', write: 'require_approval' },
};

function makeItem(
	status: McpServerConnectionItem['status'],
	connectionTimeoutMs: number,
): McpServerConnectionItem {
	return {
		id: 'registry-config:github',
		kind: 'mcp-server',
		title: 'GitHub',
		status,
		availableTools: [],
		settings: { ...permissions, connectionTimeoutMs },
	};
}

function mountForm({
	connectionTimeoutMs,
	status = 'connected',
	isNew = false,
}: {
	connectionTimeoutMs?: number;
	status?: McpServerConnectionItem['status'];
	isNew?: boolean;
} = {}) {
	const resolvedTimeout = connectionTimeoutMs ?? 60_000;
	useAgentRegistryMcpConfigMock.mockReturnValue({
		item: ref(makeItem(status, resolvedTimeout)),
		title: ref('github'),
		save: saveMock,
		changeTitle: vi.fn(),
		credentialAdapter: {},
		selectCredential: vi.fn(),
		discover: vi.fn(),
	});

	const data: AgentRegistryMcpModalData = {
		kind: 'registryMcpServer',
		mcpServer: {
			name: 'github',
			authentication: 'githubMcpOAuth2Api',
			credential: 'credential-1',
			metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			...(connectionTimeoutMs === undefined ? {} : { connectionTimeoutMs }),
		},
		isNew,
		onConfirm: vi.fn(),
	};

	return mount(AgentRegistryMcpConfigForm, {
		props: { data },
		global: {
			stubs: {
				McpConnectionStatusCallout: true,
				McpDetailBody: true,
				McpToolPermissionsEditor: {
					props: ['modelValue', 'status'],
					template: '<div data-testid="permissions-editor" :data-status="status" />',
				},
			},
		},
	});
}

function timeoutInput(wrapper: ReturnType<typeof mountForm>) {
	return wrapper.get<HTMLInputElement>('[data-testid="agent-mcp-connection-timeout"]');
}

function confirm(wrapper: ReturnType<typeof mountForm>): boolean {
	return (
		wrapper.vm as unknown as {
			confirm: () => boolean;
		}
	).confirm();
}

describe('AgentRegistryMcpConfigForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		saveMock.mockReturnValue(true);
	});

	it('defaults a new server timeout to 60,000 ms', () => {
		const wrapper = mountForm({ isNew: true });

		expect(timeoutInput(wrapper).element.value).toBe('60000');
	});

	it('shows the existing timeout when editing a server', () => {
		const wrapper = mountForm({ connectionTimeoutMs: 45_000 });

		expect(timeoutInput(wrapper).element.value).toBe('45000');
	});

	it('passes an edited timeout to the save flow', async () => {
		const wrapper = mountForm({ connectionTimeoutMs: 45_000 });
		await timeoutInput(wrapper).setValue('90000');

		expect(confirm(wrapper)).toBe(true);
		expect(saveMock).toHaveBeenCalledWith({
			...permissions,
			connectionTimeoutMs: 90_000,
		});
	});

	it.each(['', '0', '120001', '1.5'])('rejects invalid timeout value %j', async (value) => {
		const wrapper = mountForm();
		await timeoutInput(wrapper).setValue(value);

		expect(confirm(wrapper)).toBe(false);
		expect(saveMock).not.toHaveBeenCalled();
		await wrapper.vm.$nextTick();
		expect(wrapper.get('[data-testid="agent-mcp-timeout-error"]').text()).toBe(
			'agents.toolConfig.mcp.timeout.validation',
		);
	});

	it('disables only the timeout input while the connection is unhealthy', () => {
		const wrapper = mountForm({ status: 'disconnected' });

		expect(timeoutInput(wrapper).element).toBeDisabled();
		expect(wrapper.text()).toContain('agents.toolConfig.mcp.timeout.label');
		expect(wrapper.text()).toContain('agents.toolConfig.mcp.timeout.help');
	});
});
