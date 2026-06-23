import { createComponentRenderer } from '@/__tests__/render';
import CanvasNodeAgentChips from './CanvasNodeAgentChips.vue';
import type { AgentCardChip } from './canvasNodeAgentChips.utils';

const renderComponent = createComponentRenderer(CanvasNodeAgentChips);

function chip(label: string): AgentCardChip {
	return { key: `k:${label}`, icon: 'zap', label };
}

describe('CanvasNodeAgentChips', () => {
	it('renders every chip inline when within the limit', () => {
		const { getAllByTestId, queryByTestId } = renderComponent({
			props: { chips: [chip('a'), chip('b'), chip('c')], maxInline: 8 },
		});

		expect(getAllByTestId('canvas-node-agent-chip')).toHaveLength(3);
		expect(queryByTestId('canvas-node-agent-chips-overflow')).toBeNull();
	});

	it('collapses chips beyond the limit into a "+N" overflow', () => {
		const chips = ['a', 'b', 'c', 'd', 'e'].map(chip);
		const { getAllByTestId, getByText } = renderComponent({
			props: { chips, maxInline: 3 },
		});

		expect(getAllByTestId('canvas-node-agent-chip')).toHaveLength(3);
		expect(getByText('+2')).toBeInTheDocument();
	});
});
