import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiCanvasRunOverlay from '../InstanceAiCanvasRunOverlay.vue';

const renderComponent = createComponentRenderer(InstanceAiCanvasRunOverlay);

describe('InstanceAiCanvasRunOverlay', () => {
	it('shows the building wave with no label while the agent works', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { state: 'building' } });

		expect(getByTestId('instance-ai-draft-building-wave')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-agent-building-indicator')).toBeNull();
		expect(queryByTestId('instance-ai-canvas-waiting-pill')).toBeNull();
	});

	it('shows a pill instead of the wave while the run waits for an answer', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: { state: 'answer' } });

		expect(getByTestId('instance-ai-canvas-waiting-pill')).toHaveTextContent(
			'Waiting for your answer in the chat',
		);
		expect(queryByTestId('instance-ai-draft-building-wave')).toBeNull();
	});

	it('asks for an approval while the run waits for one', () => {
		const { getByTestId } = renderComponent({ props: { state: 'approval' } });

		expect(getByTestId('instance-ai-canvas-waiting-pill')).toHaveTextContent(
			'Waiting for your approval in the chat',
		);
	});

	it('asks the chat to focus the question when the user clicks the pill', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { state: 'answer' } });

		await userEvent.click(getByTestId('instance-ai-canvas-waiting-pill'));

		expect(emitted('focusChat')).toHaveLength(1);
	});
});
