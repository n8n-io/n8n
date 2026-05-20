import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import InstanceAiToolCall from '../components/InstanceAiToolCall.vue';

const renderComponent = createThreadComponentRenderer(InstanceAiToolCall, {
	global: {
		stubs: {
			CollapsibleRoot: { template: '<div><slot /></div>' },
			CollapsibleTrigger: { template: '<button><slot /></button>' },
			AnimatedCollapsibleContent: { template: '<div><slot /></div>' },
			ToolResultJson: { template: '<pre data-test-id="tool-result-json" />' },
			ToolResultRenderer: { template: '<div data-test-id="tool-result-renderer" />' },
		},
	},
});

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'search-nodes',
		args: {},
		isLoading: true,
		...overrides,
	};
}

describe('InstanceAiToolCall', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('renders eval tool calls with a human title and normal label font', () => {
		const { getByText } = renderComponent({
			props: {
				toolCall: makeToolCall({
					toolName: 'evals',
					args: { action: 'offer' },
				}),
			},
		});

		const label = getByText('Propose evaluations');
		expect(label).toBeInTheDocument();
		expect(label.className).toContain('humanToolName');
	});
});
