import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { scoreMyLeadsWorkflow } from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/score-my-leads';
import InstanceAiPreviewCanvas from './InstanceAiPreviewCanvas.vue';

const renderComponent = createComponentRenderer(InstanceAiPreviewCanvas);

describe('InstanceAiPreviewCanvas', () => {
	it('renders the canvas root element', () => {
		const { getByTestId } = renderComponent({
			props: { workflow: scoreMyLeadsWorkflow, animating: false },
		});
		expect(getByTestId('instance-ai-preview-canvas')).toBeInTheDocument();
	});

	it('renders node labels from the workflow', () => {
		const { getAllByText } = renderComponent({
			props: { workflow: scoreMyLeadsWorkflow, animating: false },
		});
		// scoreMyLeadsWorkflow has a node labelled "New lead".
		const matches = getAllByText('New lead');
		expect(matches.length).toBeGreaterThan(0);
	});
});
