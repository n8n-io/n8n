import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { waitFor } from '@testing-library/vue';
import type { InstanceAiAgentNode, InstanceAiTargetResource } from '@n8n/api-types';
import { defineComponent, h, type PropType } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import AgentSection from '../components/AgentSection.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';

const SlotStub = defineComponent({
	setup(_, { slots }) {
		return () => h('div', slots.default?.());
	},
});

const SubagentStepTimelineStub = defineComponent({
	name: 'SubagentStepTimelineStub',
	props: {
		agentNode: { type: Object as PropType<InstanceAiAgentNode>, required: true },
		agentPreviewTarget: {
			type: Object as PropType<{ agentId: string; projectId: string }>,
			required: false,
		},
		visibleEntries: { type: Array, required: false },
		peek: { type: Boolean, default: false },
	},
	setup() {
		return () => h('div');
	},
});

function makeAgentNode(
	targetResource?: InstanceAiTargetResource,
	overrides: Partial<InstanceAiAgentNode> = {},
): InstanceAiAgentNode {
	return {
		agentId: 'builder-1',
		role: 'builder',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: 'Building the agent' }],
		targetResource,
		...overrides,
	};
}

function mountSection(
	targetResource?: InstanceAiTargetResource,
	overrides: Partial<InstanceAiAgentNode> = {},
) {
	return mount(AgentSection, {
		props: { agentNode: makeAgentNode(targetResource, overrides) },
		global: {
			stubs: {
				N8nCallout: SlotStub,
				SubagentStepTimeline: SubagentStepTimelineStub,
			},
		},
	});
}

describe('AgentSection', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it.each([
		{
			label: 'valid agent target',
			targetResource: {
				type: 'agent',
				id: 'agent-2',
				projectId: 'project-2',
			} satisfies InstanceAiTargetResource,
			expected: { agentId: 'agent-2', projectId: 'project-2' },
		},
		{
			label: 'missing target',
			targetResource: undefined,
			expected: undefined,
		},
		{
			label: 'agent target with missing project',
			targetResource: { type: 'agent', id: 'agent-2' } satisfies InstanceAiTargetResource,
			expected: undefined,
		},
		{
			label: 'non-agent target',
			targetResource: {
				type: 'workflow',
				id: 'workflow-1',
				projectId: 'project-2',
			} satisfies InstanceAiTargetResource,
			expected: undefined,
		},
	])('passes the $label to both timelines', async ({ targetResource, expected }) => {
		const wrapper = mountSection(targetResource);
		const peek = wrapper.getComponent(SubagentStepTimelineStub);
		expect(peek.props('peek')).toBe(true);
		expect(peek.props('agentPreviewTarget')).toEqual(expected);

		await wrapper.get('button').trigger('click');
		const timeline = wrapper.getComponent(SubagentStepTimelineStub);
		expect(timeline.props('peek')).toBe(false);
		expect(timeline.props('agentPreviewTarget')).toEqual(expected);
	});

	it('starts open on cloud and collapses when the agent completes', async () => {
		useSettingsStore().settings.deployment = { type: 'cloud' };
		const wrapper = mountSection();
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.getComponent(SubagentStepTimelineStub).props('peek')).toBe(false);

		await wrapper.setProps({ agentNode: makeAgentNode(undefined, { status: 'completed' }) });
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		await waitFor(() => {
			expect(wrapper.findComponent(SubagentStepTimelineStub).exists()).toBe(false);
		});
	});

	it('shows only the latest renderable entry in the active preview', async () => {
		const latestEntry = { type: 'text', content: 'Latest update' } as const;
		const wrapper = mountSection(undefined, {
			timeline: [
				{ type: 'text', content: 'Earlier update' },
				latestEntry,
				{ type: 'child', agentId: 'child-1' },
			],
		});
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		expect(wrapper.getComponent(SubagentStepTimelineStub).props('visibleEntries')).toEqual([
			latestEntry,
		]);

		await wrapper.get('button').trigger('click');
		expect(wrapper.getComponent(SubagentStepTimelineStub).props('peek')).toBe(false);
		await wrapper.get('button').trigger('click');
		expect(wrapper.getComponent(SubagentStepTimelineStub).props('peek')).toBe(true);
	});

	it('renders the localized activity title', () => {
		const wrapper = mountSection(undefined, { activity: 'exploring' });

		expect(wrapper.text()).toContain('Exploring agent');
	});

	it('renders the working fallback when the node has no title', () => {
		const wrapper = mountSection(undefined, { role: '' });

		expect(wrapper.text()).toContain('Working with agent');
	});
});
