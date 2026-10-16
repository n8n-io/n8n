import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import type { InstanceAiAgentNode, InstanceAiTargetResource } from '@n8n/api-types';
import { defineComponent, h, type PropType } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import AgentSection from '../components/AgentSection.vue';

const SlotStub = defineComponent({
	setup(_, { slots }) {
		return () => h('div', slots.default?.());
	},
});

const CollapsibleRootStub = defineComponent({
	setup(_, { slots }) {
		return () => h('div', slots.default?.({ open: false }));
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
				AnimatedCollapsibleContent: SlotStub,
				CollapsibleRoot: CollapsibleRootStub,
				CollapsibleTrigger: SlotStub,
				N8nCallout: SlotStub,
				SubagentStepTimeline: SubagentStepTimelineStub,
				TimelineStepButton: SlotStub,
				TimelineStepChevron: true,
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
	])('passes the $label to both timelines', ({ targetResource, expected }) => {
		const wrapper = mountSection(targetResource);
		const timelines = wrapper.findAllComponents(SubagentStepTimelineStub);

		expect(timelines).toHaveLength(2);
		expect(timelines.map((timeline) => timeline.props('peek'))).toEqual([true, false]);
		for (const timeline of timelines) {
			expect(timeline.props('agentPreviewTarget')).toEqual(expected);
		}
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
