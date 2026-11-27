import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import type { FrontendModuleSettings, InstanceAiAgentNode } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';

const renderComponent = createThreadComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			AiActivityTrace: { template: '<div data-test-id="thinking-block-stub" />' },
			AgentSection: { template: '<div />' },
			TimelineTextSegment: { template: '<div />' },
			PreferenceCard: { template: '<div data-test-id="preference-card-stub" />' },
		},
	},
});

const rootNode = {
	agentId: 'root',
	role: 'orchestrator',
	status: 'completed',
	textContent: '',
	reasoning: '',
	toolCalls: [
		{
			toolCallId: 'tc-save',
			toolName: 'save_user_preference',
			args: { content: 'Keep replies short.', scope: 'user' },
			isLoading: false,
			error: 'The preference could not be saved.',
		},
	],
	children: [],
	timeline: [{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-save' }],
} as unknown as InstanceAiAgentNode;

function setPreferences(switchOn: boolean) {
	const settingsStore = useSettingsStore();
	settingsStore.settings.aiPreferences = { enabled: switchOn, managedByEnv: false };
	settingsStore.moduleSettings = { mcp: { mcpAccessEnabled: true } } as FrontendModuleSettings;
}

describe('AgentTimeline preference card', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows the card while preferences are on', () => {
		setPreferences(true);

		const { queryByTestId } = renderComponent({ props: { agentNode: rootNode } });

		expect(queryByTestId('preference-card-stub')).toBeInTheDocument();
	});

	it('shows nothing for the save while preferences are off', () => {
		setPreferences(false);

		const { queryByTestId, container } = renderComponent({ props: { agentNode: rootNode } });

		expect(queryByTestId('preference-card-stub')).toBeNull();
		expect(container.textContent).not.toContain('save_user_preference');
	});

	it('keeps the thinking around a hidden save in one block', () => {
		setPreferences(false);
		const node = {
			...rootNode,
			status: 'active',
			toolCalls: [
				...rootNode.toolCalls,
				{ toolCallId: 'tc-read', toolName: 'get_workflow', args: {}, isLoading: false, result: {} },
			],
			timeline: [
				{ type: 'reasoning', responseId: 'r1', content: 'First thought.' },
				{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-save' },
				{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-read' },
				{ type: 'text', responseId: 'r2', content: 'Done.' },
			],
		} as unknown as InstanceAiAgentNode;

		const { queryAllByTestId } = renderComponent({ props: { agentNode: node } });

		expect(queryAllByTestId('thinking-block-stub')).toHaveLength(1);
	});
});
