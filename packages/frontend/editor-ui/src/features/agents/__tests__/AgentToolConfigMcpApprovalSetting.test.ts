import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INode, INodePropertyOptions } from 'n8n-workflow';
import type { TestingPinia } from '@pinia/testing';

import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import AgentToolConfigMcpApprovalSetting from '../components/AgentToolConfigMcpApprovalSetting.vue';
import type { AgentJsonMcpServerConfig } from '../types';

vi.mock('@n8n/i18n', () => {
	const translations: Record<string, string> = {
		'agents.toolConfig.mcpApproval.disabled': 'Disabled',
		'agents.toolConfig.mcpApproval.askAll': 'Ask all',
		'agents.toolConfig.mcpApproval.askSelected': 'Ask selected',
	};
	const i18n = {
		baseText: (key: string) => translations[key] ?? key,
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('@n8n/design-system', async () => {
	const { defineComponent, inject, provide } = await import('vue');

	const N8nSelect = defineComponent({
		name: 'N8nSelect',
		props: {
			modelValue: { type: [String, Array], default: '' },
			multiple: { type: Boolean, default: false },
			loading: { type: Boolean, default: false },
			placeholder: { type: String, default: '' },
		},
		emits: ['update:modelValue'],
		setup(props, { emit }) {
			provide('selectOption', (value: string) => {
				if (!props.multiple) {
					emit('update:modelValue', value);
					return;
				}

				const currentValues = Array.isArray(props.modelValue) ? props.modelValue : [];
				emit('update:modelValue', [...currentValues, value]);
			});
		},
		template: `
			<div
				:data-testid="$attrs['data-test-id']"
				:data-loading="String(loading)"
				:data-placeholder="placeholder"
			>
				<slot />
			</div>
		`,
	});

	return {
		N8nButton: {
			emits: ['click'],
			template:
				'<button type="button" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
		},
		N8nIcon: { template: '<i />' },
		N8nText: { template: '<span><slot /></span>' },
		N8nTooltip: { template: '<span><slot /></span>' },
		N8nSelect,
		N8nOption: defineComponent({
			props: {
				value: { type: String, required: true },
				label: { type: String, required: true },
			},
			setup() {
				const selectOption = inject<(value: string) => void>('selectOption');
				return { selectOption };
			},
			template: `
				<button
					type="button"
					data-testid="mcp-approval-option"
					:data-value="value"
					:data-label="label"
					@click="selectOption?.(value)"
				>
					{{ label }}
				</button>
			`,
		}),
	};
});

const MCP_TOOLS: INodePropertyOptions[] = [
	{ name: 'Echo', value: 'echo' },
	{ name: 'Search', value: 'search' },
	{ name: 'Delete', value: 'delete' },
];

let pinia: TestingPinia;

function mcpNode(parameters: Partial<INode['parameters']> = {}): INode {
	return {
		id: 'mcp-node-id',
		name: 'github',
		type: '@n8n/n8n-nodes-langchain.mcpClientTool',
		typeVersion: 1.2,
		parameters: {
			endpointUrl: 'https://mcp.example.com',
			include: 'all',
			includeTools: [],
			excludeTools: [],
			...parameters,
		},
		credentials: { httpBearerAuth: { id: 'cred-1', name: 'MCP token' } },
		position: [0, 0],
	};
}

function renderComponent({
	node = mcpNode(),
	modelValue,
}: {
	node?: INode;
	modelValue?: AgentJsonMcpServerConfig['approval'];
} = {}) {
	return mount(AgentToolConfigMcpApprovalSetting, {
		props: {
			modelValue,
			node,
			projectId: 'project-1',
		},
		global: {
			plugins: [pinia],
		},
	});
}

function optionValues(wrapper: ReturnType<typeof renderComponent>) {
	return wrapper.findAll('[data-testid="mcp-approval-option"]').map((option) => ({
		label: option.attributes('data-label'),
		value: option.attributes('data-value'),
	}));
}

describe('AgentToolConfigMcpApprovalSetting', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createTestingPinia({ stubActions: false });
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeParameterOptions = vi.fn().mockResolvedValue(MCP_TOOLS);
	});

	it('loads MCP tools for the current node parameters on mount', async () => {
		renderComponent();

		await flushPromises();

		expect(nodeTypesStore.getNodeParameterOptions).toHaveBeenCalledWith({
			nodeTypeAndVersion: {
				name: '@n8n/n8n-nodes-langchain.mcpClientTool',
				version: 1.2,
			},
			path: 'parameters.includeTools',
			methodName: 'getTools',
			currentNodeParameters: expect.objectContaining({ endpointUrl: 'https://mcp.example.com' }),
			credentials: { httpBearerAuth: { id: 'cred-1', name: 'MCP token' } },
			projectId: 'project-1',
		});
	});

	it('emits global and disabled approval values when the mode changes', async () => {
		const wrapper = renderComponent();
		await flushPromises();

		await wrapper
			.find('[data-testid="agent-mcp-approval-mode"] [data-value="global"]')
			.trigger('click');
		await nextTick();

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ mode: 'global' }]);
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([true]);

		await wrapper
			.find('[data-testid="agent-mcp-approval-mode"] [data-value="disabled"]')
			.trigger('click');
		await nextTick();

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([undefined]);
	});

	it('requires at least one selected tool before selected approval is valid', async () => {
		const wrapper = renderComponent();
		await flushPromises();

		await wrapper
			.find('[data-testid="agent-mcp-approval-mode"] [data-value="selected"]')
			.trigger('click');
		await nextTick();

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ mode: 'selected', tools: [] }]);
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([false]);

		await wrapper
			.find('[data-testid="agent-mcp-approval-tools"] [data-value="echo"]')
			.trigger('click');
		await nextTick();

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
			{ mode: 'selected', tools: ['echo'] },
		]);
		expect(wrapper.emitted('update:valid')?.at(-1)).toEqual([true]);
	});

	it('shows a load error when selected mode cannot load MCP tools', async () => {
		nodeTypesStore.getNodeParameterOptions = vi
			.fn()
			.mockRejectedValue(new Error('Connection failed'));
		const wrapper = renderComponent();
		await flushPromises();

		await wrapper
			.find('[data-testid="agent-mcp-approval-mode"] [data-value="selected"]')
			.trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('agents.toolConfig.mcpApproval.loadError');
	});

	it('only offers tools exposed by the node include filter', async () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['echo'] },
			node: mcpNode({ include: 'selected', includeTools: ['echo', 'search'] }),
		});
		await flushPromises();

		expect(optionValues(wrapper)).toEqual([
			{ label: 'Disabled', value: 'disabled' },
			{ label: 'Ask all', value: 'global' },
			{ label: 'Ask selected', value: 'selected' },
			{ label: 'Echo', value: 'echo' },
			{ label: 'Search', value: 'search' },
		]);
	});

	it('prunes selected approval tools when node filters stop exposing them', async () => {
		const wrapper = renderComponent({
			modelValue: { mode: 'selected', tools: ['echo', 'delete'] },
		});
		await flushPromises();

		await wrapper.setProps({
			node: mcpNode({ include: 'selected', includeTools: ['echo'] }),
		});
		await nextTick();

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
			{ mode: 'selected', tools: ['echo'] },
		]);
	});
});
