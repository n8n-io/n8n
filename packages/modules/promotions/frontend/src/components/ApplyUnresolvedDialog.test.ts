import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';

import {
	unreachableCredential,
	unreachableWorkflow,
	usedBy,
} from '../__tests__/missingDependencies.fixtures';
import ApplyUnresolvedDialog from './ApplyUnresolvedDialog.vue';

const renderComponent = createComponentRenderer(ApplyUnresolvedDialog, {
	props: { dependencies: [unreachableCredential, unreachableWorkflow] },
});

describe('ApplyUnresolvedDialog', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('names the dependencies that stay missing, and repeats the count on the confirm button', async () => {
		const { findByRole, getAllByTestId, getByTestId } = renderComponent();

		const dialog = await findByRole('dialog', { name: 'Apply with 2 unresolved dependencies?' });
		const body =
			'These dependencies stay missing on this instance. Apply does not create them. Workflows that use them cannot be published until the dependencies exist here.';
		// The dialog also holds the hidden description, so read the text of the visible body.
		expect(dialog.querySelector('[data-slot="dialog-body"]')).toHaveTextContent(body);
		expect(dialog).toHaveAccessibleDescription(body);
		expect(
			getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim()),
		).toEqual([
			'StripeCredential · Used by Invoice reconciliation',
			'Send audit logWorkflow · Used by Weekly KPI report',
		]);
		expect(getByTestId('apply-unresolved-confirm')).toHaveTextContent(
			/^Apply with 2 unresolved dependencies$/,
		);
	});

	it('uses the singular for one dependency, and counts the workflows that the row does not name', async () => {
		const { findByRole, getByTestId } = renderComponent({
			props: {
				dependencies: [
					{
						...unreachableWorkflow,
						consumers: usedBy(
							{ id: 'w1', name: 'Invoice reconciliation' },
							{ id: 'w2', name: 'Payment reminders' },
							{ id: 'w3', name: 'Weekly KPI report' },
							{ id: 'w4', name: 'Format currency' },
						),
					},
				],
			},
		});

		expect(
			await findByRole('dialog', { name: 'Apply with 1 unresolved dependency?' }),
		).toBeVisible();
		expect(getByTestId('promotion-missing-dependency')).toHaveTextContent(
			'Workflow · Used by Invoice reconciliation, Payment reminders +2',
		);
		expect(getByTestId('apply-unresolved-confirm')).toHaveTextContent(
			/^Apply with 1 unresolved dependency$/,
		);
	});

	it('does not show the project of a dependency or of the workflows that use it', async () => {
		const { findByRole } = renderComponent();

		const dialog = await findByRole('dialog');
		// "Billing" is the project of the workflows. The API sends no project for a dependency.
		expect(dialog).not.toHaveTextContent('Billing');
		expect(dialog).not.toHaveTextContent(/project|owner/i);
	});

	it('confirms only when the user clicks the confirm button', async () => {
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-unresolved-confirm'));

		expect(emitted('confirm')).toHaveLength(1);
		expect(emitted('cancel')).toBeUndefined();
	});

	it.each([
		[
			'the Cancel button',
			async () => await userEvent.click(screen.getByTestId('apply-unresolved-cancel')),
		],
		['the Escape key', async () => await userEvent.keyboard('{Escape}')],
	])('cancels without confirming on %s', async (_name, close) => {
		const { findByTestId, emitted } = renderComponent();
		await findByTestId('apply-unresolved-dialog');

		await close();

		expect(emitted('cancel')).toHaveLength(1);
		expect(emitted('confirm')).toBeUndefined();
	});
});
