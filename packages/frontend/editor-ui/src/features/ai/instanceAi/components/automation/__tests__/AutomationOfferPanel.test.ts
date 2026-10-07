import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { LIVE_REGION_ANNOUNCE_DELAY } from '@/app/constants/durations';
import AutomationOfferPanel from '../AutomationOfferPanel.vue';

const renderComponent = createComponentRenderer(AutomationOfferPanel, {
	props: { workflowName: 'Daily sales report' },
});

describe('AutomationOfferPanel', () => {
	it('shows the offer copy with the workflow name', () => {
		const { getByTestId } = renderComponent();

		const panel = getByTestId('automation-offer-panel');
		expect(panel).toHaveTextContent('Want this to happen automatically?');
		expect(panel).toHaveTextContent('"Daily sales report" worked. n8n can run it for you.');
		expect(getByTestId('automation-offer-accept')).toHaveTextContent('Make it automatic');
	});

	it('is a region named by its title', () => {
		const { getByRole, getByTestId } = renderComponent();

		expect(getByRole('region', { name: 'Want this to happen automatically?' })).toBe(
			getByTestId('automation-offer-panel'),
		);
	});

	it('gives the icon-only dismiss button an accessible name', () => {
		const { getByRole, getByTestId } = renderComponent();

		expect(getByRole('button', { name: 'Dismiss' })).toBe(getByTestId('automation-offer-dismiss'));
		expect(getByRole('button', { name: 'Make it automatic' })).toBe(
			getByTestId('automation-offer-accept'),
		);
	});

	it('shows a workflow name as plain text', () => {
		const { getByTestId } = renderComponent({ props: { workflowName: '<b>Leads</b> & "VIP"' } });

		const panel = getByTestId('automation-offer-panel');
		expect(panel).toHaveTextContent('"<b>Leads</b> & "VIP"" worked.');
		expect(panel.querySelector('b')).toBeNull();
	});

	it('emits accept when the primary button is clicked', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderComponent();

		await user.click(getByTestId('automation-offer-accept'));

		expect(emitted().accept).toEqual([[]]);
		expect(emitted().dismiss).toBeUndefined();
	});

	it('emits dismiss when the dismiss button is clicked', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderComponent();

		await user.click(getByTestId('automation-offer-dismiss'));

		expect(emitted().dismiss).toEqual([[]]);
		expect(emitted().accept).toBeUndefined();
	});

	it('can be used with the keyboard alone', async () => {
		const user = userEvent.setup();
		const { emitted, getByTestId } = renderComponent();

		await user.tab();
		expect(getByTestId('automation-offer-dismiss')).toHaveFocus();
		await user.tab();
		expect(getByTestId('automation-offer-accept')).toHaveFocus();
		await user.keyboard('{Enter}');

		expect(emitted().accept).toEqual([[]]);
	});

	describe('announcement', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('announces the offer politely after the panel is in the page', async () => {
			vi.useFakeTimers();
			const { getByRole } = renderComponent();
			const status = getByRole('status');
			expect(status).toBeEmptyDOMElement();

			vi.advanceTimersByTime(LIVE_REGION_ANNOUNCE_DELAY - 1);
			await nextTick();
			expect(status).toBeEmptyDOMElement();

			vi.advanceTimersByTime(1);
			await nextTick();
			expect(status).toHaveTextContent('New suggestion: make "Daily sales report" automatic');
		});

		it('leaves the focus where it is', async () => {
			vi.useFakeTimers();
			renderComponent();

			vi.advanceTimersByTime(LIVE_REGION_ANNOUNCE_DELAY);
			await nextTick();

			expect(document.body).toHaveFocus();
		});

		it('stops the announcement when the panel goes away first', async () => {
			vi.useFakeTimers();
			const { unmount } = renderComponent();
			const timersWhileMounted = vi.getTimerCount();

			unmount();

			expect(vi.getTimerCount()).toBe(timersWhileMounted - 1);
		});
	});
});
