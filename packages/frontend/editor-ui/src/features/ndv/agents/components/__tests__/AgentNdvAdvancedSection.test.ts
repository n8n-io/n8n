import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';

import AgentNdvAdvancedSection from '../AgentNdvAdvancedSection.vue';
import { NdvAgentConfigKey } from '../../composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '../../composables/useNdvAgentConfig';
import type { AgentJsonConfig } from '@/features/agents/types';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useI18n: () => ({
		baseText: (key: string) => key,
		nodeText: () => ({
			inputLabelDisplayName: (parameter: { displayName: string }) => parameter.displayName,
			placeholder: () => 'Add Option',
		}),
	}),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	injectNDVStore: () =>
		computed(() => ({
			activeNode: { id: 'node-1', type: 'n8n-nodes-base.messageAnAgent' },
		})),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({ displayParameter: () => true }),
}));

const ParameterInputListStub = {
	name: 'ParameterInputList',
	props: ['parameters', 'nodeValues', 'path', 'isReadOnly', 'isNested', 'newlyAddedParameters'],
	emits: ['valueChanged', 'parameterBlur'],
	template: '<div data-testid="parameter-input-list-stub" />',
};

const MemoryPanelStub = {
	name: 'AgentMemoryPanel',
	props: ['config', 'disabled', 'embedded'],
	emits: ['update:config'],
	template: '<div data-testid="memory-panel-stub" />',
};

const AdvancedPanelStub = {
	name: 'AgentAdvancedPanel',
	props: ['config', 'disabled', 'fields'],
	emits: ['update:config'],
	template: '<div data-testid="advanced-panel-stub" />',
};

const advancedParameter: INodeProperties = {
	displayName: 'Advanced',
	name: 'advanced',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Session ID',
			name: 'sessionId',
			type: 'string',
			default: '',
		},
		{
			displayName: "Allow Agent to Access Other Nodes' Data",
			name: 'allowOtherNodesData',
			type: 'boolean',
			default: false,
		},
	],
};

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		tools: [],
		// Non-default values must NOT auto-add agent options.
		config: { webSearch: { enabled: true, method: 'native' } },
		...overrides,
	} as AgentJsonConfig;
}

type NdvOverrides = Partial<{
	agentId: string;
	canUpdate: boolean;
	isUnavailable: boolean;
	localConfig: AgentJsonConfig | null;
}>;

function createNdvStub(overrides: NdvOverrides = {}) {
	const scheduleConfigUpdate = vi.fn();
	const value = {
		isAgentNode: computed(() => true),
		agentId: computed(() => overrides.agentId ?? 'agent-1'),
		canUpdate: computed(() => overrides.canUpdate ?? true),
		isUnavailable: ref(overrides.isUnavailable ?? false),
		localConfig: ref('localConfig' in overrides ? overrides.localConfig : makeConfig()),
		scheduleConfigUpdate,
	} as unknown as UseNdvAgentConfigReturn;
	return { value, scheduleConfigUpdate };
}

function mountSection(
	stub: { value: UseNdvAgentConfigReturn },
	props: { nodeValues?: INodeParameters; isReadOnly?: boolean } = {},
) {
	return mount(AgentNdvAdvancedSection, {
		props: {
			parameter: advancedParameter,
			nodeValues: props.nodeValues ?? { parameters: { advanced: {} } },
			isReadOnly: props.isReadOnly,
		},
		global: {
			provide: { [NdvAgentConfigKey as symbol]: stub.value },
			stubs: {
				ParameterInputList: ParameterInputListStub,
				AgentMemoryPanel: MemoryPanelStub,
				AgentAdvancedPanel: AdvancedPanelStub,
			},
		},
	});
}

// The design-system dropdown is generically typed, which defeats
// `findComponent(N8nDropdownMenu)`'s overloads — look it up by name instead.
function findDropdown(wrapper: ReturnType<typeof mountSection>) {
	return wrapper.findComponent({ name: 'DropdownMenu' });
}

function dropdownItems(wrapper: ReturnType<typeof mountSection>) {
	return (findDropdown(wrapper).props('items') as Array<{ id: string }>).map((item) => item.id);
}

async function selectOption(wrapper: ReturnType<typeof mountSection>, id: string) {
	findDropdown(wrapper).vm.$emit('select', id);
	await wrapper.vm.$nextTick();
}

describe('AgentNdvAdvancedSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('offers node options and agent options in one dropdown', () => {
		const wrapper = mountSection(createNdvStub());
		expect(dropdownItems(wrapper)).toEqual([
			'node:sessionId',
			'node:allowOtherNodesData',
			'agent:episodicMemory',
			'agent:webSearch',
			'agent:thinking',
			'agent:toolCallConcurrency',
			'agent:maxIterations',
		]);
	});

	it('adds a node option by emitting its default onto the node parameters', async () => {
		const wrapper = mountSection(createNdvStub());
		await selectOption(wrapper, 'node:sessionId');

		expect(wrapper.emitted('valueChanged')).toEqual([
			[{ name: 'parameters.advanced.sessionId', value: '' }],
		]);
	});

	it('renders chosen node options via ParameterInputList and drops them from the dropdown', () => {
		const wrapper = mountSection(createNdvStub(), {
			nodeValues: { parameters: { advanced: { sessionId: 'abc' } } },
		});

		const list = wrapper.findComponent(ParameterInputListStub);
		expect(list.exists()).toBe(true);
		expect(list.props('path')).toBe('parameters.advanced');
		expect(
			(list.props('parameters') as INodeProperties[]).map((parameter) => parameter.name),
		).toEqual(['sessionId']);
		expect(dropdownItems(wrapper)).not.toContain('node:sessionId');
	});

	it('starts with no agent options visible, even when the config has non-default values', () => {
		// makeConfig() has webSearch enabled — it must still start hidden.
		const wrapper = mountSection(createNdvStub());
		expect(wrapper.find('[data-test-id^="agent-ndv-advanced-option-"]').exists()).toBe(false);
	});

	it('adds an agent option by persisting it to the hidden node parameter, not the agent config', async () => {
		const stub = createNdvStub();
		const wrapper = mountSection(stub);
		await selectOption(wrapper, 'agent:webSearch');

		expect(wrapper.emitted('valueChanged')).toEqual([
			[{ name: 'parameters.agentOptions', value: ['webSearch'] }],
		]);
		expect(stub.scheduleConfigUpdate).not.toHaveBeenCalled();
	});

	it('renders the persisted agent options and drops them from the dropdown', () => {
		const wrapper = mountSection(createNdvStub(), {
			nodeValues: { parameters: { advanced: {}, agentOptions: ['webSearch'] } },
		});

		const panel = wrapper.findComponent(AdvancedPanelStub);
		expect(panel.exists()).toBe(true);
		expect(panel.props('fields')).toEqual(['webSearch']);
		expect(dropdownItems(wrapper)).not.toContain('agent:webSearch');
	});

	it('renders the memory panel for the episodic memory option', () => {
		const wrapper = mountSection(createNdvStub(), {
			nodeValues: { parameters: { advanced: {}, agentOptions: ['episodicMemory'] } },
		});
		expect(wrapper.findComponent(MemoryPanelStub).exists()).toBe(true);
	});

	it('forwards agent field edits to scheduleConfigUpdate', () => {
		const stub = createNdvStub();
		const wrapper = mountSection(stub, {
			nodeValues: { parameters: { advanced: {}, agentOptions: ['thinking'] } },
		});

		wrapper.findComponent(AdvancedPanelStub).vm.$emit('update:config', { config: {} });
		expect(stub.scheduleConfigUpdate).toHaveBeenCalledWith({ config: {} });
	});

	it('removes an agent option from the hidden node parameter without touching the agent config', async () => {
		const stub = createNdvStub();
		const wrapper = mountSection(stub, {
			nodeValues: { parameters: { advanced: {}, agentOptions: ['maxIterations'] } },
		});
		expect(wrapper.find('[data-test-id="agent-ndv-advanced-option-maxIterations"]').exists()).toBe(
			true,
		);

		await wrapper.find('[data-test-id="agent-ndv-advanced-remove-option"]').trigger('click');

		expect(wrapper.emitted('valueChanged')).toEqual([
			[{ name: 'parameters.agentOptions', value: [] }],
		]);
		expect(stub.scheduleConfigUpdate).not.toHaveBeenCalled();
	});

	it('hides persisted agent option rows when no agent is referenced', () => {
		const wrapper = mountSection(createNdvStub({ agentId: '' }), {
			nodeValues: { parameters: { advanced: {}, agentOptions: ['webSearch'] } },
		});
		expect(wrapper.find('[data-test-id^="agent-ndv-advanced-option-"]').exists()).toBe(false);
	});

	it.each([
		['no agent referenced', { agentId: '' }],
		['the agent is unavailable', { isUnavailable: true }],
		['the user cannot update the agent', { canUpdate: false }],
		['the config has not loaded', { localConfig: null }],
	] as Array<[string, NdvOverrides]>)('offers only node options when %s', (_, overrides) => {
		const wrapper = mountSection(createNdvStub(overrides));
		expect(dropdownItems(wrapper)).toEqual(['node:sessionId', 'node:allowOtherNodesData']);
	});

	it('renders no add affordances in read-only mode', () => {
		const wrapper = mountSection(createNdvStub(), { isReadOnly: true });
		expect(findDropdown(wrapper).exists()).toBe(false);
	});
});
