import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
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
	return { key: `k:${label}`, icon: 'zap', label, activityKeys: [], ...overrides };
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

	it('animates a matching inline capability with the canvas running state', () => {
		const { getByTestId } = renderComponent({
			props: {
				chips: [chip('Lookup', { activityKeys: ['tool:lookup'] })],
				activeCapabilityKeys: new Set(['tool:lookup']),
			},
		});

		const activeChip = getByTestId('canvas-node-agent-chip');
		expect(activeChip).toHaveAttribute('aria-busy', 'true');
		expect(activeChip.className).not.toContain('running');
		expect(activeChip.parentElement?.className).toContain('running');
		expect(activeChip.parentElement?.querySelector('.statusRing')).not.toBeNull();
	});

	it('does not animate an inactive inline capability', () => {
		const { getByTestId } = renderComponent({
			props: {
				chips: [chip('Lookup', { activityKeys: ['tool:lookup'] })],
				activeCapabilityKeys: new Set(),
			},
		});

		const inactiveChip = getByTestId('canvas-node-agent-chip');
		expect(inactiveChip).toHaveAttribute('aria-busy', 'false');
		expect(inactiveChip.className).not.toContain('running');
		expect(inactiveChip.parentElement?.className).not.toContain('running');
		expect(inactiveChip.parentElement?.querySelector('.statusRing')).toBeNull();
	});

	it('marks the overflow pill active when a hidden capability is active', () => {
		const { getByTestId } = renderComponent({
			props: {
				chips: [
					chip('Visible', { activityKeys: ['tool:visible'] }),
					chip('Hidden', { activityKeys: ['tool:hidden'] }),
				],
				maxInline: 1,
				isReadOnly: true,
				activeCapabilityKeys: new Set(['tool:hidden']),
			},
		});

		const overflowChip = getByTestId('canvas-node-agent-chips-overflow');
		expect(overflowChip).toHaveAttribute('aria-busy', 'true');
		expect(overflowChip.className).not.toContain('running');
		expect(overflowChip.parentElement?.className).toContain('running');
		expect(overflowChip.parentElement?.querySelector('.statusRing')).not.toBeNull();
	});

	it.each([[true], [false]])(
		'keeps the editable overflow button as the menu trigger (active: %s)',
		async (active) => {
			const { getByTestId, container } = renderComponent({
				props: {
					chips: [chip('Visible'), chip('Hidden', { activityKeys: ['tool:hidden'] })],
					maxInline: 1,
					activeCapabilityKeys: new Set(active ? ['tool:hidden'] : []),
				},
			});

			const trigger = getByTestId('canvas-node-agent-chips-overflow');
			expect(trigger.tagName).toBe('BUTTON');
			expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
			expect(trigger).toHaveAttribute('aria-expanded', 'false');
			expect(container.querySelectorAll('.statusRing')).toHaveLength(active ? 1 : 0);

			trigger.focus();
			await userEvent.keyboard('{Enter}');
			await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));

			await userEvent.keyboard('{Escape}');
			await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
			expect(trigger).toHaveFocus();
		},
	);
});
