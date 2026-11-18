import { N8nActionDropdown, N8nInlineTextEdit } from '@n8n/design-system';
import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { ToolPolicy, ToolPolicyTemplate } from '@n8n/api-types';
import { N8nInput } from '@n8n/design-system';

import AgentToolPolicyPanel from '../components/AgentToolPolicyPanel.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (name: string) =>
			name === 'n8n-nodes-base.gmailTool' ? { displayName: 'Gmail' } : null,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			const copy: Record<string, string> = {
				'agents.toolPolicy.selector.workflow': '{name} (workflow)',
				'agents.toolPolicy.selector.mcpServer': '{name} (MCP server)',
				'agents.toolPolicy.selector.nodeType': 'All {name} tools',
				'agents.toolPolicy.selector.missing': '{name} (removed)',
				'agents.toolPolicy.rule.warning.missingTools': 'Missing: {tools}',
				'agents.toolPolicy.rule.title': 'Rule {index}',
				'agents.toolPolicy.rule.warning.overlap': 'Overlap: {tools}',
			};
			const template = copy[key] ?? key;
			const values = options?.interpolate ?? {};
			return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
		},
	}),
}));

const readDb = { kind: 'tool', ref: { type: 'node', name: 'Read Customer DB' } } as const;
const sendEmail = { kind: 'tool', ref: { type: 'node', name: 'Send Email' } } as const;
const refundFlow = { kind: 'tool', ref: { type: 'workflow', workflowId: 'wf-1' } } as const;

function makeConfig(toolPolicy?: ToolPolicy): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test agent',
		tools: [
			{
				type: 'node',
				name: 'Read Customer DB',
				node: { nodeType: 'n8n-nodes-base.postgresTool', nodeTypeVersion: 1, nodeParameters: {} },
			},
			{
				type: 'node',
				name: 'Send Email',
				node: { nodeType: 'n8n-nodes-base.gmailTool', nodeTypeVersion: 1, nodeParameters: {} },
			},
			{ type: 'workflow', workflow: 'Refund flow', workflowId: 'wf-1', name: 'refund' },
		],
		mcpServers: [
			{ name: 'crm', url: 'https://example.com/mcp', transport: 'sse', authentication: 'none' },
		],
		config: {
			guardrails: {
				budget: { enabled: true, monthlyBudgetUsd: 10 },
				...(toolPolicy ? { toolPolicy } : {}),
			},
		},
	};
}

// Element Plus renders options only when the dropdown is open, so the test stubs the select.
const stubs = {
	N8nSelect: {
		name: 'N8nSelect',
		props: ['modelValue', 'disabled', 'multiple'],
		emits: ['update:modelValue'],
		template: '<div v-bind="$attrs"><slot /></div>',
	},
	N8nOption: {
		name: 'N8nOption',
		props: ['value', 'label'],
		template: '<span>{{ label }}</span>',
	},
};

function render(config: AgentJsonConfig, disabled = false) {
	return mount(AgentToolPolicyPanel, {
		props: { config, disabled },
		global: { stubs: { ...stubs, Select: stubs.N8nSelect, Option: stubs.N8nOption } },
	});
}

function select(wrapper: VueWrapper, testId: string, index = 0) {
	const found = wrapper
		.findAllComponents({ name: 'N8nSelect' })
		.filter((component) => component.attributes('data-testid') === testId);
	return found[index];
}

function lastPolicy(wrapper: VueWrapper): ToolPolicy | undefined {
	const events = wrapper.emitted<[Partial<AgentJsonConfig>]>('update:config') ?? [];
	return events.at(-1)?.[0].config?.guardrails?.toolPolicy;
}

describe('AgentToolPolicyPanel', () => {
	it('shows the rule position until the rule has a name, and saves a new name', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'r1', action: 'deny', tools: [sendEmail] }],
			}),
		);

		const nameEdit = wrapper.findComponent(N8nInlineTextEdit);
		expect(nameEdit.props('modelValue')).toBe('');
		expect(nameEdit.props('placeholder')).toBe('Rule 1');

		nameEdit.vm.$emit('update:model-value', 'No email after lookup');

		expect(lastPolicy(wrapper)?.rules[0]).toEqual({
			id: 'r1',
			name: 'No email after lookup',
			action: 'deny',
			tools: [sendEmail],
		});
	});

	it('removes the name when it is cleared', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'r1', name: 'Old name', action: 'deny', tools: [sendEmail] }],
			}),
		);

		wrapper.findComponent(N8nInlineTextEdit).vm.$emit('update:model-value', '');

		expect(lastPolicy(wrapper)?.rules[0]).not.toHaveProperty('name');
	});

	it('lists agent tools, MCP servers, and node types as tool options', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'r1', action: 'deny', tools: [sendEmail] }],
			}),
		);

		const labels = select(wrapper, 'agent-tool-policy-rule-tools')
			.findAllComponents({ name: 'N8nOption' })
			.map((option) => option.props('label'));
		expect(labels).toEqual([
			'agents.toolPolicy.category.sendsDataOut',
			'agents.toolPolicy.category.readsData',
			'Read Customer DB',
			'Send Email',
			'refund (workflow)',
			'crm (MCP server)',
			'All n8n-nodes-base.postgresTool tools',
			'All Gmail tools',
		]);
	});

	it('adds a deny rule and saves it once it has tools and a condition', async () => {
		const wrapper = render(makeConfig());

		await wrapper.find('[data-testid="agent-tool-policy-add-rule"]').trigger('click');
		expect(wrapper.findAll('[data-testid="agent-tool-policy-rule"]')).toHaveLength(1);
		expect(wrapper.find('[data-testid="agent-tool-policy-rule-incomplete"]').exists()).toBe(true);
		expect(wrapper.emitted('update:config')).toBeUndefined();

		select(wrapper, 'agent-tool-policy-rule-tools').vm.$emit('update:modelValue', [
			'["tool","node","Send Email"]',
		]);
		await nextTick();
		// The rule applies after a tool use by default, and no used tool is selected yet.
		expect(wrapper.emitted('update:config')).toBeUndefined();

		select(wrapper, 'agent-tool-policy-rule-tool-used').vm.$emit('update:modelValue', [
			'["tool","node","Read Customer DB"]',
		]);
		await nextTick();

		const changes = wrapper.emitted<[Partial<AgentJsonConfig>]>('update:config')?.at(-1)?.[0];
		expect(changes?.config?.guardrails).toEqual({
			budget: { enabled: true, monthlyBudgetUsd: 10 },
			toolPolicy: {
				defaultAction: 'allow',
				rules: [{ id: 'rule-1', action: 'deny', tools: [sendEmail], when: { toolUsed: [readDb] } }],
			},
		});
	});

	it('saves a trimmed message on deny rules only', async () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'r1', action: 'deny', tools: [sendEmail] }],
			}),
		);

		wrapper.findComponent(N8nInput).vm.$emit('update:modelValue', '  Not now  ');
		await nextTick();
		expect(lastPolicy(wrapper)?.rules[0].message).toBe('Not now');

		select(wrapper, 'agent-tool-policy-rule-action').vm.$emit('update:modelValue', 'allow');
		await nextTick();
		expect(lastPolicy(wrapper)?.rules[0]).toEqual({
			id: 'r1',
			action: 'allow',
			tools: [sendEmail],
		});
		expect(wrapper.find('[data-testid="agent-tool-policy-rule-message"]').exists()).toBe(false);
	});

	it('removes the policy and keeps other guardrails when the last rule is removed', async () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'r1', action: 'deny', tools: [sendEmail] }],
			}),
		);

		await wrapper.find('[data-testid="agent-tool-policy-rule-remove"]').trigger('click');

		const changes = wrapper.emitted<[Partial<AgentJsonConfig>]>('update:config')?.at(-1)?.[0];
		expect(changes?.config?.guardrails).toEqual({
			budget: { enabled: true, monthlyBudgetUsd: 10 },
		});
	});

	it('warns when default deny leaves no tool for the start of a conversation', async () => {
		const wrapper = render(makeConfig());
		expect(wrapper.find('[data-testid="agent-tool-policy-start-warning"]').exists()).toBe(false);

		select(wrapper, 'agent-tool-policy-default-action').vm.$emit('update:modelValue', 'deny');
		await nextTick();

		expect(lastPolicy(wrapper)).toEqual({ defaultAction: 'deny', rules: [] });
		expect(wrapper.find('[data-testid="agent-tool-policy-start-warning"]').exists()).toBe(true);
	});

	it('does not warn about the start when an always-allow rule exists', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'deny',
				rules: [{ id: 'r1', action: 'allow', tools: [readDb] }],
			}),
		);

		expect(wrapper.find('[data-testid="agent-tool-policy-start-warning"]').exists()).toBe(false);
	});

	it('warns about removed tools and about a tool in both condition and tools', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [
					{
						id: 'r1',
						action: 'deny',
						tools: [sendEmail, { kind: 'tool', ref: { type: 'mcpServer', name: 'gone' } }],
						when: { toolUsed: [sendEmail] },
					},
				],
			}),
		);

		const warnings = wrapper
			.findAll('[data-testid="agent-tool-policy-rule-warning"]')
			.map((warning) => warning.text());
		expect(warnings).toEqual(['Missing: gone (removed)', 'Overlap: Send Email']);
	});

	it('warns when a node type selection covers a tool named in the condition', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [
					{
						id: 'r1',
						action: 'deny',
						tools: [{ kind: 'nodeType', value: 'n8n-nodes-base.gmailTool' }],
						when: { toolUsed: [sendEmail] },
					},
				],
			}),
		);

		const warnings = wrapper
			.findAll('[data-testid="agent-tool-policy-rule-warning"]')
			.map((warning) => warning.text());
		expect(warnings).toEqual(['Overlap: Send Email']);
	});

	it('does not warn when the condition and the tools cover different tools', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [
					{
						id: 'r1',
						action: 'deny',
						tools: [{ kind: 'nodeType', value: 'n8n-nodes-base.gmailTool' }],
						when: { toolUsed: [readDb] },
					},
				],
			}),
		);

		expect(wrapper.find('[data-testid="agent-tool-policy-rule-warning"]').exists()).toBe(false);
	});

	it('shows a saved all-of condition as "after all of these tools"', () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [
					{
						id: 'r1',
						action: 'deny',
						tools: [sendEmail],
						when: { all: [{ toolUsed: [readDb] }, { toolUsed: [refundFlow] }] },
					},
				],
			}),
		);

		expect(select(wrapper, 'agent-tool-policy-rule-applies').props('modelValue')).toBe('afterAll');
		expect(select(wrapper, 'agent-tool-policy-rule-tool-used').props('modelValue')).toHaveLength(2);
		expect(wrapper.find('[data-testid="agent-tool-policy-rule-advanced"]').exists()).toBe(false);
	});

	it('saves "after all of these tools" as an all condition', async () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'r1', action: 'deny', tools: [sendEmail], when: { toolUsed: [readDb] } }],
			}),
		);

		select(wrapper, 'agent-tool-policy-rule-applies').vm.$emit('update:modelValue', 'afterAll');
		await nextTick();
		// With one used tool, "all" and "any" mean the same, so nothing changes.
		expect(wrapper.emitted('update:config')).toBeUndefined();

		select(wrapper, 'agent-tool-policy-rule-tool-used').vm.$emit('update:modelValue', [
			'["tool","node","Read Customer DB"]',
			'["tool","workflow","wf-1"]',
		]);
		await nextTick();
		expect(lastPolicy(wrapper)?.rules[0].when).toEqual({
			all: [{ toolUsed: [readDb] }, { toolUsed: [refundFlow] }],
		});
	});

	it('adds the rules of a template after the existing rules, with new ids', async () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'rule-1', action: 'deny', tools: [sendEmail] }],
			}),
		);

		wrapper
			.findComponent(N8nActionDropdown)
			.vm.$emit('select', 'preventDataLeaks' satisfies ToolPolicyTemplate);
		await nextTick();

		expect(lastPolicy(wrapper)).toEqual({
			defaultAction: 'allow',
			rules: [
				{ id: 'rule-1', action: 'deny', tools: [sendEmail] },
				{
					id: 'rule-2',
					name: 'No sending data out after reading business data',
					action: 'deny',
					tools: [{ kind: 'category', value: 'sendsDataOut' }],
					when: { toolUsed: [{ kind: 'category', value: 'readsData' }] },
				},
			],
		});
	});

	it('sets the default action when the template has one', async () => {
		const wrapper = render(makeConfig());

		wrapper.findComponent(N8nActionDropdown).vm.$emit('select', 'readOnly');
		await nextTick();

		const policy = lastPolicy(wrapper);
		expect(policy?.defaultAction).toBe('deny');
		expect(policy?.rules.map((rule) => rule.action)).toEqual(['allow', 'deny']);
		expect(wrapper.find('[data-testid="agent-tool-policy-start-warning"]').exists()).toBe(false);
	});

	it('warns that Gmail is in both categories of the data leak template', async () => {
		const wrapper = render(makeConfig());

		wrapper.findComponent(N8nActionDropdown).vm.$emit('select', 'preventDataLeaks');
		await nextTick();

		const warnings = wrapper
			.findAll('[data-testid="agent-tool-policy-rule-warning"]')
			.map((warning) => warning.text());
		expect(warnings).toEqual(['Overlap: Send Email']);
	});

	it('shows a nested condition as read-only and keeps it on save', async () => {
		const when = { any: [{ toolUsed: [readDb] }, { toolUsed: [sendEmail] }] };
		const wrapper = render(
			makeConfig({
				defaultAction: 'allow',
				rules: [{ id: 'r1', action: 'deny', tools: [{ kind: 'nodeType', value: 'x' }], when }],
			}),
		);

		expect(wrapper.find('[data-testid="agent-tool-policy-rule-advanced"]').exists()).toBe(true);
		expect(select(wrapper, 'agent-tool-policy-rule-applies')).toBeUndefined();

		select(wrapper, 'agent-tool-policy-rule-action').vm.$emit('update:modelValue', 'allow');
		await nextTick();

		expect(lastPolicy(wrapper)?.rules[0].when).toEqual(when);
	});

	it('gives each new rule a unique id', async () => {
		const wrapper = render(
			makeConfig({
				defaultAction: 'deny',
				rules: [{ id: 'rule-2', action: 'allow', tools: [readDb] }],
			}),
		);

		await wrapper.find('[data-testid="agent-tool-policy-add-rule"]').trigger('click');
		select(wrapper, 'agent-tool-policy-rule-applies', 1).vm.$emit('update:modelValue', 'always');
		select(wrapper, 'agent-tool-policy-rule-tools', 1).vm.$emit('update:modelValue', [
			'["tool","workflow","wf-1"]',
		]);
		await nextTick();

		expect(lastPolicy(wrapper)?.rules.map((rule) => rule.id)).toEqual(['rule-2', 'rule-3']);
	});

	it('does not emit changes when disabled', async () => {
		const wrapper = render(makeConfig(), true);

		select(wrapper, 'agent-tool-policy-default-action').vm.$emit('update:modelValue', 'deny');
		await nextTick();

		expect(wrapper.emitted('update:config')).toBeUndefined();
	});
});
