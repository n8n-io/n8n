import { createComponentRenderer } from '@/__tests__/render';
import CanvasNodeAgentChips from './CanvasNodeAgentChips.vue';
import type { AgentCardChip } from './canvasNodeAgentChips.utils';

const { getNodeTypeMock } = vi.hoisted(() => ({ getNodeTypeMock: vi.fn() }));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: getNodeTypeMock }),
}));

const renderComponent = createComponentRenderer(CanvasNodeAgentChips, {
	global: {
		stubs: {
			// Render the node icon as a marker so we can assert it without pulling
			// in NodeIcon's icon-resolution internals.
			NodeIcon: { template: '<i data-test-id="chip-node-icon" />' },
		},
	},
});

function chip(label: string, overrides: Partial<AgentCardChip> = {}): AgentCardChip {
	return { key: `k:${label}`, icon: 'zap', label, ...overrides };
}

beforeEach(() => {
	getNodeTypeMock.mockReset().mockReturnValue(null);
});

describe('CanvasNodeAgentChips', () => {
	it('renders every chip inline when within the limit', () => {
		const { getAllByTestId, queryByTestId } = renderComponent({
			props: { chips: [chip('a'), chip('b'), chip('c')], maxInline: 8 },
		});

		expect(getAllByTestId('canvas-node-agent-chip')).toHaveLength(3);
		expect(queryByTestId('canvas-node-agent-chips-overflow')).toBeNull();
	});

	it('collapses chips beyond the limit into a "+N" overflow', () => {
		const chips = ['a', 'b', 'c', 'd', 'e'].map((label) => chip(label));
		const { getAllByTestId, getByText } = renderComponent({
			props: { chips, maxInline: 3 },
		});

		expect(getAllByTestId('canvas-node-agent-chip')).toHaveLength(3);
		expect(getByText('+2')).toBeInTheDocument();
	});

	it("renders the node's icon for a node-tool chip when the node type resolves", () => {
		getNodeTypeMock.mockReturnValue({
			name: 'n8n-nodes-base.telegramTool',
			displayName: 'Telegram',
		});

		const { getByTestId } = renderComponent({
			props: { chips: [chip('Send message', { nodeType: 'n8n-nodes-base.telegramTool' })] },
		});

		expect(getByTestId('chip-node-icon')).toBeInTheDocument();
	});

	it('falls back to the design-system icon when the node type is unresolved', () => {
		getNodeTypeMock.mockReturnValue(null);

		const { queryByTestId } = renderComponent({
			props: { chips: [chip('Send message', { nodeType: 'n8n-nodes-base.unknownTool' })] },
		});

		expect(queryByTestId('chip-node-icon')).toBeNull();
	});
});
