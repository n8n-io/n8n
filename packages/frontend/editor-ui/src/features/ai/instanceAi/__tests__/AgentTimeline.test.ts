import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import AgentTimeline from '../components/AgentTimeline.vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';

vi.mock('@/features/ai/chatHub/components/ChatMarkdownChunk.vue', () => ({
	default: {
		template: '<span>{{ source.content }}</span>',
		props: ['source'],
	},
}));

const renderComponent = createComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			ToolCallStep: { template: '<div data-test-id="tool-call-step" />' },
		},
	},
});

const localStorageStub = {
	getItem: vi.fn(() => 'false'),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

const originalLocalStorage = globalThis.localStorage;

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

describe('AgentTimeline', () => {
	beforeAll(() => {
		vi.stubGlobal('localStorage', localStorageStub);
	});

	afterAll(() => {
		if (typeof originalLocalStorage === 'undefined') {
			Reflect.deleteProperty(globalThis, 'localStorage');
		} else {
			Object.defineProperty(globalThis, 'localStorage', {
				configurable: true,
				value: originalLocalStorage,
			});
		}
	});

	beforeEach(() => {
		createTestingPinia();
	});

	it('renders the actions timeline label in uppercase', () => {
		const { getByText, queryByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content: 'actions' }],
				}),
			},
		});

		expect(getByText('ACTIONS')).toBeInTheDocument();
		expect(queryByText('actions')).not.toBeInTheDocument();
	});

	it('leaves regular timeline text unchanged', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					timeline: [{ type: 'text', content: 'Analyzing actions' }],
				}),
			},
		});

		expect(getByText('Analyzing actions')).toBeInTheDocument();
	});
});
