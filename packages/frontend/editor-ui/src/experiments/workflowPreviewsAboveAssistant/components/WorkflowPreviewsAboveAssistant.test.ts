// Experiment cleanup (124_workflow_previews_above_assistant)
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import WorkflowPreviewsAboveAssistant from './WorkflowPreviewsAboveAssistant.vue';

const renderComponent = createComponentRenderer(WorkflowPreviewsAboveAssistant);

describe('WorkflowPreviewsAboveAssistant', () => {
	it('shows three example cards with a title and description only', () => {
		const { getByTestId, queryByTestId, queryByRole } = renderComponent();
		const leadCard = getByTestId('workflow-preview-card-score-my-leads');

		expect(leadCard).toHaveTextContent('Lead enrichment & alerts');
		expect(leadCard).toHaveTextContent(
			'When someone fills the website form, enrich them with company data, score the lead and post the hot ones in Slack.',
		);
		expect(getByTestId('workflow-preview-card-schedule-social-posts')).toHaveTextContent(
			'Weekly social post scheduler',
		);
		expect(getByTestId('workflow-preview-card-process-invoices')).toHaveTextContent(
			'Invoice validation',
		);
		expect(
			getByTestId('workflow-preview-cards').querySelectorAll('button[data-example-id]'),
		).toHaveLength(3);
		expect(leadCard).not.toHaveTextContent('Trigger · 5 nodes · 2 outputs');
		expect(leadCard).not.toHaveTextContent('Sales');
		expect(queryByTestId('workflow-preview-category-for-you')).not.toBeInTheDocument();
		expect(queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
		expect(queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
		expect(leadCard).toHaveStyle({ '--enter-index': '0' });
		expect(getByTestId('workflow-preview-card-process-invoices')).toHaveStyle({
			'--enter-index': '2',
		});
	});

	it('embeds the original workflow and plays it on hover without input or output cards', async () => {
		const { getByTestId } = renderComponent();
		const leadCard = getByTestId('workflow-preview-card-score-my-leads');

		expect(
			leadCard.querySelector('[data-test-id="workflow-preview-node-salesforce-trigger"]'),
		).toBeTruthy();
		expect(
			leadCard.querySelector('[data-test-id="workflow-preview-node-notify-sales"]'),
		).toBeTruthy();
		expect(leadCard.querySelector('[data-test-id="workflow-preview-input"]')).toBeNull();
		expect(
			leadCard.querySelector('[data-test-id="workflow-preview-output-notify-sales"]'),
		).toBeNull();

		await fireEvent.mouseEnter(leadCard);
		expect(leadCard.querySelector('[data-test-id="workflow-preview-stage"]')?.className).toContain(
			'hovered',
		);
	});

	it('previews the prompt on hover and uses the example when the card is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		const card = getByTestId('workflow-preview-card-score-my-leads');
		const promptKey = 'experiments.workflowPreviewsAboveAssistant.examples.scoreMyLeads.prompt';

		await fireEvent.mouseEnter(card);
		expect(emitted()['preview-prompt']).toEqual([[promptKey]]);

		await fireEvent.click(card);
		expect(emitted()['use-example']).toEqual([
			[expect.objectContaining({ id: 'score-my-leads', promptKey }), 1],
		]);

		await fireEvent.mouseLeave(card);
		expect(emitted()['preview-prompt']?.at(-1)).toEqual([null]);
	});

	it('shows a shuffle button and a see more button below the cards', () => {
		const { getByTestId, getByRole } = renderComponent();

		expect(getByRole('button', { name: 'Shuffle examples' })).toBe(
			getByTestId('workflow-preview-shuffle'),
		);
		expect(getByTestId('workflow-preview-shuffle')).not.toHaveTextContent('Shuffle examples');
		expect(getByTestId('workflow-preview-see-more')).toHaveTextContent('Browse examples');
		expect(getByTestId('workflow-preview-actions')).toHaveStyle({ '--enter-index': '3' });
	});

	it('opens the catalog from see more and closes it once an example is picked', async () => {
		const { getByTestId, emitted } = renderComponent();

		expect(screen.queryByTestId('workflow-preview-catalog')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('workflow-preview-see-more'));
		const catalog = await screen.findByTestId('workflow-preview-catalog');
		expect(
			screen
				.getByTestId('workflow-preview-catalog-cards')
				.querySelectorAll('button[data-example-id]'),
		).toHaveLength(3);
		expect(catalog).toContainElement(screen.getByTestId('workflow-preview-catalog-details'));

		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-next'));
		await fireEvent.click(screen.getByTestId('workflow-preview-card-onboard-new-signups'));

		expect(emitted()['use-example']).toEqual([
			[expect.objectContaining({ id: 'onboard-new-signups' }), 6],
		]);
		await waitFor(() =>
			expect(screen.queryByTestId('workflow-preview-catalog')).not.toBeInTheDocument(),
		);
	});

	it('reports the catalog position of a card that is not first', async () => {
		const { getByTestId, emitted } = renderComponent();

		await fireEvent.click(getByTestId('workflow-preview-card-process-invoices'));

		expect(emitted()['use-example']).toEqual([
			[expect.objectContaining({ id: 'process-invoices' }), 3],
		]);
	});
});
