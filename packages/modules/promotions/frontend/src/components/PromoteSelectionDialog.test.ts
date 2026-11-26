import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import {
	otherProjectCredential,
	outsideAccessWorkflow,
	usedBy,
} from '../__tests__/missingDependencies.fixtures';
import PromoteSelectionDialog from './PromoteSelectionDialog.vue';

const renderComponent = createComponentRenderer(PromoteSelectionDialog, {
	props: {
		open: true,
		changeCount: 3,
		baseBranchName: 'main',
		createBranchOnPromotion: false,
		providerType: 'git',
	},
});

describe('PromoteSelectionDialog', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('names the change count and the target branch', async () => {
		const { findByTestId, getByTestId, queryByTestId } = renderComponent();

		const dialog = await findByTestId('promote-selection-dialog');
		expect(dialog).toHaveTextContent('Promote 3 changes?');
		// The dialog also holds the hidden description, so read the text of the visible body.
		expect(dialog.querySelector('[data-slot="dialog-body"]')).toHaveTextContent(
			'This promotes the selected changes to branch main.',
		);
		expect(dialog).toHaveAccessibleDescription(
			'This promotes the selected changes to branch main.',
		);
		expect(queryByTestId('promotion-unresolved-summary')).not.toBeInTheDocument();
		expect(getByTestId('promote-confirm-button')).toHaveTextContent(/^Promote$/);
	});

	it('warns above the message field about the workflows that the Promote leaves without a dependency', async () => {
		const { findByTestId, getAllByTestId, getByRole, getByTestId } = renderComponent({
			props: {
				unresolved: [
					otherProjectCredential,
					{
						...outsideAccessWorkflow,
						consumers: usedBy(
							{ id: 'w1', name: 'Invoice reconciliation' },
							{ id: 'w2', name: 'Payment reminders' },
							{ id: 'w3', name: 'Weekly KPI report' },
						),
					},
				],
			},
		});

		const dialog = await findByTestId('promote-selection-dialog');
		// The title is the same with and without missing dependencies.
		expect(getByRole('heading', { name: 'Promote 3 changes?' })).toBeVisible();
		const lead = "3 workflows can't be published because their dependencies can't be promoted.";
		expect(getByTestId('promotion-unresolved-lead')).toHaveTextContent(lead);
		expect(dialog).toHaveAccessibleDescription(
			`This promotes the selected changes to branch main. ${lead}`,
		);
		expect(
			getAllByTestId('promotion-unresolved-row').map((row) =>
				[...row.children].map((child) => child.textContent?.trim()),
			),
		).toEqual([
			['Invoice reconciliation', 'Missing CRM key, Send audit log.'],
			['Payment reminders', 'Missing Send audit log.'],
			['Weekly KPI report', 'Missing Send audit log.'],
		]);
		// The warning replaces the sentence about the branch, and comes before the message field.
		const body = dialog.querySelector('[data-slot="dialog-body"]');
		expect(body).not.toHaveTextContent('This promotes the selected changes');
		expect(
			getByTestId('promotion-unresolved-summary').compareDocumentPosition(
				getByTestId('promote-commit-message'),
			) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		// The confirm button repeats the label of the button of the page.
		expect(getByTestId('promote-confirm-button')).toHaveTextContent(/^Promote 3 changes$/);
		expect(dialog).not.toHaveTextContent(/unresolved/i);
		// The message field keeps the focus, below the list.
		await waitFor(() => expect(getByTestId('promote-commit-message')).toHaveFocus());
	});

	it('uses the singular for one workflow, and counts the dependencies that its row does not name', async () => {
		const consumers = usedBy({ id: 'w1', name: 'Invoice reconciliation' });
		const { findByTestId, getByTestId } = renderComponent({
			props: {
				changeCount: 1,
				unresolved: [
					otherProjectCredential,
					{ ...outsideAccessWorkflow, consumers },
					{ ...otherProjectCredential, id: 'c9', name: 'ERP key' },
					{ ...otherProjectCredential, id: 'c10', name: 'Tax API' },
				],
			},
		});

		expect(await findByTestId('promotion-unresolved-lead')).toHaveTextContent(
			"1 workflow can't be published because its dependency can't be promoted.",
		);
		expect(getByTestId('promotion-unresolved-row')).toHaveTextContent(
			'Missing CRM key, Send audit log and 2 more.',
		);
		expect(getByTestId('promote-confirm-button')).toHaveTextContent(/^Promote 1 change$/);
	});

	it('counts and names the dependencies when no workflow uses them', async () => {
		const { findByTestId, getAllByTestId } = renderComponent({
			props: {
				unresolved: [
					{ ...otherProjectCredential, consumers: [] },
					{ ...outsideAccessWorkflow, consumers: [] },
				],
			},
		});

		expect(await findByTestId('promotion-unresolved-lead')).toHaveTextContent(
			/^2 dependencies are not promoted\.$/,
		);
		expect(
			getAllByTestId('promotion-unresolved-row').map((row) => row.textContent?.trim()),
		).toEqual(['CRM key', 'Send audit log']);
	});

	it('confirms with the message when the Promote leaves out dependencies', async () => {
		const { findByTestId, getByTestId, emitted } = renderComponent({
			props: { unresolved: [otherProjectCredential] },
		});

		await userEvent.type(await findByTestId('promote-commit-message'), 'Route leads by region');
		await userEvent.click(getByTestId('promote-confirm-button'));

		expect(emitted('confirm')).toEqual([['Route leads by region']]);
	});

	it('says that GitLab gets a merge request when promotions create a branch', async () => {
		const { findByTestId } = renderComponent({
			props: { createBranchOnPromotion: true, providerType: 'gitlab' },
		});

		expect(await findByTestId('promote-selection-dialog')).toHaveTextContent(
			'This promotes the selected changes to a new branch and opens a merge request into branch main.',
		);
	});

	it('confirms without a message when the field is empty or blank', async () => {
		const { findByTestId, getByTestId, emitted } = renderComponent();

		await userEvent.type(await findByTestId('promote-commit-message'), '   ');
		await userEvent.click(getByTestId('promote-confirm-button'));

		expect(emitted('confirm')).toEqual([[undefined]]);
	});

	it('confirms with the trimmed message', async () => {
		const { findByTestId, getByTestId, emitted } = renderComponent();

		await userEvent.type(await findByTestId('promote-commit-message'), '  Route leads by region  ');
		await userEvent.click(getByTestId('promote-confirm-button'));

		expect(emitted('confirm')).toEqual([['Route leads by region']]);
	});

	it('limits the message to the length that the API accepts and counts it', async () => {
		const { findByTestId, getByTestId } = renderComponent();

		const field = await findByTestId('promote-commit-message');
		expect(field).toHaveAttribute('maxlength', '1000');

		await userEvent.type(field, 'Route leads');

		expect(getByTestId('promote-commit-message-character-count')).toHaveTextContent('11/1000');
	});

	it('closes without confirming on cancel', async () => {
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('promote-cancel-button'));

		expect(emitted('update:open')).toEqual([[false]]);
		expect(emitted('confirm')).toBeUndefined();
	});
});
