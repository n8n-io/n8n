import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import AiReasoningBlock from './AiReasoningBlock.vue';

const renderComponent = createComponentRenderer(AiReasoningBlock);

describe('AiReasoningBlock', () => {
	it('labels reasoning with its first sentence', () => {
		const { getByText } = renderComponent({
			props: { entry: { content: 'Inspect the inputs first. Then answer.' } },
		});

		expect(getByText('Inspect the inputs first.')).toBeInTheDocument();
	});
});
