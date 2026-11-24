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
		expect(dialog).toHaveTextContent('This promotes the selected changes to branch main.');
		expect(dialog).toHaveAccessibleDescription(
			'This promotes the selected changes to branch main.',
		);
		expect(queryByTestId('promotion-missing-dependency-list')).not.toBeInTheDocument();
		expect(getByTestId('promote-confirm-button')).toHaveTextContent(/^Promote$/);
	});

	it('asks the user to confirm the dependencies that the Promote leaves out', async () => {
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
		expect(getByRole('heading', { name: 'Promote with 2 unresolved dependencies?' })).toBeVisible();
		const leftOut =
			'These dependencies are not on the branch after this Promote. Workflows that use them cannot be published where this is applied until the dependencies exist there.';
		expect(dialog).toHaveTextContent(
			`This promotes the selected changes to branch main.${leftOut}`,
		);
		expect(dialog).toHaveAccessibleDescription(
			`This promotes the selected changes to branch main. ${leftOut}`,
		);
		expect(
			getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim()),
		).toEqual([
			'CRM keyCredential · Used by Invoice reconciliation',
			'Send audit logWorkflow · Used by Invoice reconciliation, Payment reminders +1',
		]);
		expect(getByTestId('promote-confirm-button')).toHaveTextContent(
			/^Promote with 2 unresolved dependencies$/,
		);
		// The message field keeps the focus, below the list.
		await waitFor(() => expect(getByTestId('promote-commit-message')).toHaveFocus());
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
