import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import CanvasWaitingState from './CanvasWaitingState.vue';

const renderComponent = createComponentRenderer(CanvasWaitingState);

describe('CanvasWaitingState', () => {
	it('renders the ready hint and a labelled tip', () => {
		const { getByTestId, getByText } = renderComponent();
		expect(getByTestId('instance-ai-canvas-loader')).toBeInTheDocument();
		expect(getByText('Ready when you are')).toBeInTheDocument();
		expect(getByText('Tip:')).toBeInTheDocument();
		expect(getByText(/build new automations/)).toBeInTheDocument();
	});
});
