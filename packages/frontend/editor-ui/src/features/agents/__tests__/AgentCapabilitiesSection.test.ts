import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentCapabilitiesSection from '../components/AgentCapabilitiesSection.vue';
import type { AgentJsonToolRef, CustomToolEntry } from '../types';

const getNodeType = vi.fn(() => null);

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType,
	}),
}));

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: { value: [] },
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

function mountSection(
	tools: AgentJsonToolRef[],
	customTools: Record<string, CustomToolEntry> = {},
) {
	return mount(AgentCapabilitiesSection, {
		props: {
			config: null,
			tools,
			customTools,
			skills: [],
			connectedTriggers: [],
			projectId: 'project-id',
			agentId: 'agent-id',
			isPublished: false,
		},
		global: {
			stubs: {
				NodeIcon: { template: '<span />' },
				N8nButton: { template: '<button><slot name="icon" /><slot /></button>' },
				N8nDropdownMenu: {
					name: 'N8nDropdownMenu',
					props: ['items'],
					emits: ['select'],
					template:
						'<div><slot name="trigger" /><button v-for="item in items" :key="item.id" @click="$emit(\'select\', item.id)">{{ item.label }}</button><slot /></div>',
				},
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<span><slot /></span>' },
			},
		},
	});
}

describe('AgentCapabilitiesSection', () => {
	it('formats node and custom tool chip labels for display', () => {
		getNodeType.mockReturnValue(null);

		const wrapper = mountSection(
			[
				{
					type: 'node',
					name: 'fetch_webpage',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4.4,
						nodeParameters: {},
					},
				},
				{ type: 'custom', id: 'tool_123' },
			],
			{
				tool_123: {
					code: '',
					descriptor: {
						name: 'seo_analyzer',
						description: 'Analyze HTML for SEO issues',
						systemInstruction: null,
						inputSchema: null,
						outputSchema: null,
						hasSuspend: false,
						hasResume: false,
						hasToMessage: false,
						requireApproval: false,
						providerOptions: null,
					},
				},
			},
		);

		const text = wrapper.text();
		expect(text).toContain('Fetch webpage');
		expect(text).toContain('Seo analyzer');
		expect(text).not.toContain('fetch_webpage');
		expect(text).not.toContain('tool_123');
	});

	it('keeps a single tool of the same type ungrouped', () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === 'n8n-nodes-base.gmailTool') {
				return {
					name: 'n8n-nodes-base.gmailTool',
					displayName: 'Gmail Tool',
				};
			}

			return null;
		});

		const wrapper = mountSection([
			{
				type: 'node',
				name: 'inbox_triage',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		]);

		expect(wrapper.text()).not.toContain('2 Gmail');
		expect(wrapper.text()).toContain('Inbox triage');
	});

	it('groups tools once the same node type reaches the threshold', () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === 'n8n-nodes-base.gmailTool') {
				return {
					name: 'n8n-nodes-base.gmailTool',
					displayName: 'Gmail Tool',
				};
			}

			return null;
		});

		const wrapper = mountSection([
			{
				type: 'node',
				name: 'inbox_triage',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				type: 'node',
				name: 'send_follow_up',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		]);

		expect(wrapper.text()).toContain('2 Gmail');
		expect(wrapper.text()).not.toContain('Inbox triage');
		expect(wrapper.text()).not.toContain('Send follow up');
	});

	it('groups more than two tools of the same node type', () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === 'n8n-nodes-base.gmailTool') {
				return {
					name: 'n8n-nodes-base.gmailTool',
					displayName: 'Gmail Tool',
				};
			}

			return null;
		});

		const wrapper = mountSection([
			{
				type: 'node',
				name: 'inbox_triage',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				type: 'node',
				name: 'send_follow_up',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				type: 'node',
				name: 'archive_message',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		]);

		expect(wrapper.text()).toContain('3 Gmail');
		expect(wrapper.text()).not.toContain('Inbox triage');
		expect(wrapper.text()).not.toContain('Send follow up');
		expect(wrapper.text()).not.toContain('Archive message');
	});
});
