import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	McpServerConnectionItem,
	McpToolSettings,
} from '@/features/shared/toolsConnection/types';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';

import AgentRegistryMcpConfigForm from '../components/AgentRegistryMcpConfigForm.vue';
import type { AgentRegistryMcpModalData } from '../composables/useAgentRegistryMcpConfig';

const saveMock = vi.hoisted(() => vi.fn());
const useAgentRegistryMcpConfigMock = vi.hoisted(() => vi.fn());
const confirmRemove = vi.hoisted(() => vi.fn());
const baseTextMock = vi.hoisted(() => vi.fn((key: string) => key));

vi.mock('../composables/useAgentRegistryMcpConfig', () => ({
	MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS: 1_000,
	DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS: 60_000,
	MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS: 120_000,
	useAgentRegistryMcpConfig: useAgentRegistryMcpConfigMock,
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmRemove }),
}));

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: baseTextMock };
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
	connectionTimeoutMs?: number,
): McpServerConnectionItem {
	return {
		id: 'registry-config:github',
		kind: 'mcp-server',
		title: 'GitHub',
		status,
		availableTools: [],
		settings: {
			...permissions,
			...(connectionTimeoutMs === undefined ? {} : { connectionTimeoutMs }),
		},
	};
}

function mountForm({
	connectionTimeoutMs,
	status = 'connected',
	isNew = false,
	onRemove,
	itemAvailable = true,
}: {
	connectionTimeoutMs?: number;
	status?: McpServerConnectionItem['status'];
	isNew?: boolean;
	onRemove?: () => void;
	itemAvailable?: boolean;
} = {}) {
	useAgentRegistryMcpConfigMock.mockReturnValue({
		item: ref(itemAvailable ? makeItem(status, connectionTimeoutMs) : null),
		title: ref('github'),
		save: saveMock,
		changeTitle: vi.fn(),
		credentialAdapter: {},
		selectCredential: vi.fn(),
		discover: vi.fn(),
	});

	const data: AgentRegistryMcpModalData = {
		kind: 'registryMcpServer',
		projectId: 'project-1',
		mcpServer: {
			name: 'github',
			authentication: 'githubMcpOAuth2Api',
			credential: 'credential-1',
			metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
			...(connectionTimeoutMs === undefined ? {} : { connectionTimeoutMs }),
		},
		isNew,
		onConfirm: vi.fn(),
		onRemove,
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

async function remove(wrapper: ReturnType<typeof mountForm>): Promise<boolean> {
	return await (
		wrapper.vm as unknown as {
			remove: () => Promise<boolean>;
		}
	).remove();
}

describe('AgentRegistryMcpConfigForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		saveMock.mockReturnValue(true);
		confirmRemove.mockResolvedValue(MODAL_CANCEL);
	});

	it('shows the default timeout in seconds', () => {
		const wrapper = mountForm({ isNew: true });

		expect(timeoutInput(wrapper).element.value).toBe('60');
		expect(timeoutInput(wrapper).attributes()).toMatchObject({
			min: '1',
			max: '120',
			step: '1',
		});
	});

	it('converts an existing millisecond timeout to seconds', () => {
		const wrapper = mountForm({ connectionTimeoutMs: 45_000 });

		expect(timeoutInput(wrapper).element.value).toBe('45');
	});

	it('converts an edited timeout back to milliseconds for the save flow', async () => {
		const wrapper = mountForm({ connectionTimeoutMs: 45_000 });
		await timeoutInput(wrapper).setValue('90');

		expect(confirm(wrapper)).toBe(true);
		expect(saveMock).toHaveBeenCalledWith({
			...permissions,
			connectionTimeoutMs: 90_000,
		});
	});

	it.each(['', '0', '121', '1.5'])('rejects invalid timeout value %j', async (value) => {
		const wrapper = mountForm();
		await timeoutInput(wrapper).setValue(value);

		expect(confirm(wrapper)).toBe(false);
		expect(saveMock).not.toHaveBeenCalled();
		await wrapper.vm.$nextTick();
		const error = wrapper.get('[data-testid="agent-mcp-timeout-error"]');
		expect(error.text()).toBe('agents.toolConfig.mcp.timeout.validation');
		expect(baseTextMock).toHaveBeenCalledWith('agents.toolConfig.mcp.timeout.validation', {
			interpolate: { min: 1, max: 120 },
		});
		expect(error.attributes('id')).toBe('agent-mcp-connection-timeout-error');
		expect(timeoutInput(wrapper).attributes('aria-describedby')).toBe(
			'agent-mcp-connection-timeout-help agent-mcp-connection-timeout-error',
		);
	});

	it('disables only the timeout input while the connection is unhealthy', () => {
		const wrapper = mountForm({ status: 'disconnected' });

		expect(timeoutInput(wrapper).element).toBeDisabled();
		expect(wrapper.text()).toContain('agents.toolConfig.mcp.timeout.label');
		expect(wrapper.text()).toContain('agents.toolConfig.mcp.timeout.help');
	});

	it('disables save while the registry configuration is unavailable', () => {
		const wrapper = mountForm({ itemAvailable: false });

		expect((wrapper.vm as unknown as { saveDisabled: boolean }).saveDisabled).toBe(true);
	});

	it('keeps the server when removal is cancelled', async () => {
		const onRemove = vi.fn();
		const wrapper = mountForm({ onRemove });

		await expect(remove(wrapper)).resolves.toBe(false);
		expect(confirmRemove).toHaveBeenCalledWith(
			'tools.connection.settings.removeConfirm.description',
			expect.objectContaining({
				confirmButtonText: 'tools.connection.settings.removeConfirm.confirmButton',
			}),
		);
		expect(baseTextMock).toHaveBeenCalledWith(
			'tools.connection.settings.removeConfirm.description',
			{ interpolate: { item: 'tool', service: 'github' } },
		);
		expect(baseTextMock).toHaveBeenCalledWith(
			'tools.connection.settings.removeConfirm.confirmButton',
			{ interpolate: { item: 'tool' } },
		);
		expect(onRemove).not.toHaveBeenCalled();
	});

	it('removes the server after confirmation', async () => {
		confirmRemove.mockResolvedValue(MODAL_CONFIRM);
		const onRemove = vi.fn();
		const wrapper = mountForm({ onRemove });

		await expect(remove(wrapper)).resolves.toBe(true);
		expect(onRemove).toHaveBeenCalledOnce();
	});
});
