// Experiment cleanup (124_workflow_previews_above_assistant)
import { fireEvent, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import WorkflowPreviewCatalogModal from './WorkflowPreviewCatalogModal.vue';

const render = createComponentRenderer(WorkflowPreviewCatalogModal, {
	props: { open: true },
});

// The dialog is portaled to the body and mounts a tick after the component.
async function renderComponent() {
	const result = render();
	await screen.findByRole('dialog');
	return result;
}

function visibleCardIds() {
	return [
		...screen
			.getByTestId('workflow-preview-catalog-cards')
			.querySelectorAll<HTMLElement>('button[data-example-id]'),
	].map((card) => card.dataset.exampleId);
}

function expectPageIndicator(label: string, pageCount: number, activePage: number) {
	const indicator = screen.getByTestId('workflow-preview-catalog-range');
	const dots = [...indicator.children];

	expect(indicator).toHaveAttribute('aria-label', label);
	expect(indicator.textContent?.trim()).toBe('');
	expect(dots).toHaveLength(pageCount);
	expect(dots.findIndex((dot) => dot.hasAttribute('data-active'))).toBe(activePage);
}

function detailsTitle() {
	return screen.getByTestId('workflow-preview-catalog-details-title');
}

describe('WorkflowPreviewCatalogModal', () => {
	it('shows the header copy and the first page of three examples', async () => {
		await renderComponent();

		expect(screen.getByRole('dialog')).toHaveTextContent('Start from an example');
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'Pick one to fill in the prompt. You can edit it before you send.',
		);
		expect(visibleCardIds()).toEqual([
			'score-my-leads',
			'schedule-social-posts',
			'process-invoices',
		]);
		expectPageIndicator('1–3 of 6', 2, 0);
		expect(screen.getByTestId('workflow-preview-catalog-previous')).toBeDisabled();
		expect(screen.getByTestId('workflow-preview-catalog-filters')).not.toBeVisible();
	});

	it('pages through the remaining examples', async () => {
		await renderComponent();

		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-next'));

		expect(visibleCardIds()).toEqual([
			'triage-support-inbox',
			'daily-news-digest',
			'onboard-new-signups',
		]);
		expectPageIndicator('4–6 of 6', 2, 1);
		expect(screen.getByTestId('workflow-preview-catalog-next')).toBeDisabled();
		expect(detailsTitle()).toHaveTextContent('Support inbox triage');

		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-previous'));
		expect(visibleCardIds()[0]).toBe('score-my-leads');
	});

	it('resets to the first page on filter change and hides the pager when one page fits', async () => {
		await renderComponent();

		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-next'));
		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-filter-event'));

		expect(visibleCardIds()).toEqual([
			'score-my-leads',
			'process-invoices',
			'triage-support-inbox',
		]);
		expectPageIndicator('1–3 of 4', 2, 0);

		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-filter-schedule'));
		expect(visibleCardIds()).toEqual(['schedule-social-posts', 'daily-news-digest']);
		expect(screen.getByTestId('workflow-preview-catalog-filter-schedule')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		expect(screen.queryByTestId('workflow-preview-catalog-pager')).not.toBeInTheDocument();
	});

	it('details the first card by default and follows the hovered card', async () => {
		await renderComponent();
		const invoices = screen.getByTestId('workflow-preview-card-process-invoices');

		expect(detailsTitle()).toHaveTextContent('Lead enrichment & alerts');
		expect(screen.getByTestId('workflow-preview-card-score-my-leads')).toHaveAttribute(
			'aria-current',
			'true',
		);

		await fireEvent.mouseEnter(invoices);
		expect(detailsTitle()).toHaveTextContent('Invoice validation');
		expect(invoices).toHaveAttribute('aria-current', 'true');
		expect(screen.getByTestId('workflow-preview-catalog-details-prompt')).toHaveTextContent(
			'Build a workflow that triggers when a new invoice lands in my Gmail inbox.',
		);

		const apps = screen.getByTestId('workflow-preview-catalog-details-apps');
		expect(apps).toHaveTextContent('Gmail');
		expect(apps).toHaveTextContent('Claude');
		expect(apps).toHaveTextContent('Google Calendar');

		await fireEvent.mouseLeave(invoices);
		expect(detailsTitle()).toHaveTextContent('Invoice validation');
	});

	it('emits the example with its catalog position from a card or the details button', async () => {
		const { emitted } = await renderComponent();

		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-filter-schedule'));
		await fireEvent.click(screen.getByTestId('workflow-preview-card-daily-news-digest'));

		await fireEvent.mouseEnter(screen.getByTestId('workflow-preview-card-daily-news-digest'));
		await fireEvent.click(screen.getByTestId('workflow-preview-catalog-details-use'));

		expect(emitted()['use-example']).toEqual([
			[expect.objectContaining({ id: 'daily-news-digest' }), 5],
			[expect.objectContaining({ id: 'daily-news-digest' }), 5],
		]);
	});

	it('has no footer', async () => {
		await renderComponent();

		expect(screen.getByRole('dialog').querySelector('footer')).toBeNull();
		expect(screen.queryByText('Describe my own instead')).not.toBeInTheDocument();
	});
});
