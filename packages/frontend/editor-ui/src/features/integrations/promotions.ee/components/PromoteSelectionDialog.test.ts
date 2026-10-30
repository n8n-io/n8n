import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
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
		const { findByTestId } = renderComponent();

		const dialog = await findByTestId('promote-selection-dialog');
		expect(dialog).toHaveTextContent('Promote 3 changes?');
		expect(dialog).toHaveTextContent('This promotes the selected changes to branch main.');
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
