import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import InstanceAiAgentPreview from '../components/InstanceAiAgentPreview.vue';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import type { ThreadRuntime } from '../instanceAi.store';

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function makeThread(messages: InstanceAiMessage[]): ThreadRuntime {
	// InstanceAiAgentPreview only reads `thread.messages` — no need for a full runtime.
	return { messages } as unknown as ThreadRuntime;
}

const AgentBuilderViewStub = defineComponent({
	name: 'AgentBuilderView',
	props: {
		artifactMode: { type: Boolean, default: false },
		artifactProjectId: { type: String, default: undefined },
		artifactAgentId: { type: String, default: undefined },
		artifactRefreshKey: { type: Number, default: 0 },
		artifactEditingLocked: { type: Boolean, default: false },
	},
	setup(props) {
		return () =>
			h('div', {
				'data-test-id': 'agent-builder-view-stub',
				'data-locked': String(props.artifactEditingLocked),
			});
	},
});

function renderPreview(messages: InstanceAiMessage[]) {
	const render = createThreadComponentRenderer(
		InstanceAiAgentPreview,
		{
			props: { projectId: 'project-1', agentId: 'agent-1', refreshKey: 0 },
			global: { stubs: { AgentBuilderView: AgentBuilderViewStub } },
		},
		() => makeThread(messages),
	);
	return render();
}

describe('InstanceAiAgentPreview', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('locks editing while an active agent-builder child targets this agent, without dimming or hiding content', () => {
		const builder = makeAgentNode({
			agentId: 'agent-builder-1',
			kind: 'agent-builder',
			status: 'active',
			targetResource: { type: 'agent', id: 'agent-1' },
		});
		const root = makeAgentNode({ children: [builder] });
		const message = { agentTree: root } as unknown as InstanceAiMessage;

		const { getByTestId, queryByTestId, container } = renderPreview([message]);

		expect(getByTestId('agent-builder-view-stub').getAttribute('data-locked')).toBe('true');
		expect(queryByTestId('agent-preview-building-overlay')).not.toBeInTheDocument();
		expect(container.querySelector('[inert]')).toBeNull();
	});

	it('does not lock editing once the agent-builder child has completed', () => {
		const builder = makeAgentNode({
			agentId: 'agent-builder-1',
			kind: 'agent-builder',
			status: 'completed',
			targetResource: { type: 'agent', id: 'agent-1' },
		});
		const root = makeAgentNode({ children: [builder] });
		const message = { agentTree: root } as unknown as InstanceAiMessage;

		const { getByTestId } = renderPreview([message]);

		expect(getByTestId('agent-builder-view-stub').getAttribute('data-locked')).toBe('false');
	});

	it('does not lock editing when no message targets this agent', () => {
		const { getByTestId } = renderPreview([]);

		expect(getByTestId('agent-builder-view-stub').getAttribute('data-locked')).toBe('false');
	});
});
