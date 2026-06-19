import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ListeningLoader from './ListeningLoader.vue';

const renderComponent = createComponentRenderer(ListeningLoader);

describe('ListeningLoader', () => {
	it('renders the loader with a listening hint', () => {
		const { getByTestId, getByText } = renderComponent();
		expect(getByTestId('instance-ai-canvas-loader')).toBeInTheDocument();
		expect(getByText('Listening…')).toBeInTheDocument();
	});
});
