import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/vue';

import {
	unreachableCredential,
	unreachableWorkflow,
	usedBy,
} from '../__tests__/missingDependencies.fixtures';
import ApplyUnresolvedDialog from './ApplyUnresolvedDialog.vue';

// "Invoice reconciliation" uses the credential, and "Weekly KPI report" the sub-workflow.
const renderComponent = createComponentRenderer(ApplyUnresolvedDialog, {
	props: { dependencies: [unreachableCredential, unreachableWorkflow], changeCount: 4 },
});

const rowTexts = () =>
	screen
		.getAllByTestId('promotion-unresolved-row')
		.map((row) => [...row.children].map((child) => child.textContent?.trim()));

describe('ApplyUnresolvedDialog', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('asks to apply the changes, and names the workflows with what each one misses', async () => {
		const { findByRole, getByTestId } = renderComponent();

		const dialog = await findByRole('dialog', { name: 'Apply 4 changes?' });
		const lead = "2 workflows can't be published because their dependencies don't exist here.";
		expect(getByTestId('promotion-unresolved-lead')).toHaveTextContent(lead);
		expect(dialog).toHaveAccessibleDescription(lead);
		expect(rowTexts()).toEqual([
			['Invoice reconciliation', 'Missing Stripe.'],
			['Weekly KPI report', 'Missing Send audit log.'],
		]);
		// The warning icon comes first, then the sentence, then the list.
		const summary = getByTestId('promotion-unresolved-summary');
		expect(summary.children[0]).toHaveAttribute('data-icon', 'triangle-alert');
		expect(summary.children[2]).toBe(getByTestId('promotion-unresolved-list'));
		// The confirm button repeats the label of the button of the page.
		expect(getByTestId('apply-unresolved-confirm')).toHaveTextContent(/^Apply 4 changes$/);
		expect(dialog).not.toHaveTextContent(/unresolved/i);
	});

	it('uses the singular for one change and one workflow, and counts the dependencies that a row does not name', async () => {
		const reconciliation = usedBy({ id: 'w1', name: 'Invoice reconciliation' });
		const { findByRole, getByTestId } = renderComponent({
			props: {
				changeCount: 1,
				dependencies: [
					{ ...unreachableCredential, consumers: reconciliation },
					{ ...unreachableWorkflow, consumers: reconciliation },
					{ ...unreachableWorkflow, id: 'w20', name: 'Close month', consumers: reconciliation },
					{ ...unreachableWorkflow, id: 'w21', name: 'Sync ledger', consumers: reconciliation },
				],
			},
		});

		expect(await findByRole('dialog', { name: 'Apply 1 change?' })).toBeVisible();
		expect(getByTestId('promotion-unresolved-lead')).toHaveTextContent(
			"1 workflow can't be published because its dependency doesn't exist here.",
		);
		expect(rowTexts()).toEqual([
			['Invoice reconciliation', 'Missing Stripe, Send audit log and 2 more.'],
		]);
		expect(getByTestId('apply-unresolved-confirm')).toHaveTextContent(/^Apply 1 change$/);
	});

	it('counts and names the dependencies when no workflow uses them', async () => {
		const { findByTestId } = renderComponent({
			props: { dependencies: [{ ...unreachableCredential, consumers: [] }] },
		});

		expect(await findByTestId('promotion-unresolved-lead')).toHaveTextContent(
			/^1 dependency is not applied\.$/,
		);
		expect(rowTexts()).toEqual([['Stripe']]);
	});

	it('does not show the project of a dependency or of the workflows that use it', async () => {
		const { findByRole } = renderComponent();

		const dialog = await findByRole('dialog');
		// "Billing" is the project of the workflows. An Apply check sends no project for a dependency.
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
		const dialog = await findByTestId('apply-unresolved-dialog');
		expect(within(dialog).getByTestId('promotion-unresolved-list')).toBeVisible();

		await close();

		expect(emitted('cancel')).toHaveLength(1);
		expect(emitted('confirm')).toBeUndefined();
	});
});
