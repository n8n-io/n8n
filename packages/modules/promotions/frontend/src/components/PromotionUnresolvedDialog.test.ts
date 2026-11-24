import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { outsideAccess } from '../__tests__/unresolved.fixtures';
import PromotionUnresolvedDialog from './PromotionUnresolvedDialog.vue';

const renderComponent = createComponentRenderer(PromotionUnresolvedDialog, {
	props: { open: true, changeCount: 3, dependencies: outsideAccess },
});

describe('PromotionUnresolvedDialog', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should name the dependencies that the Apply leaves out and repeat the label of the button', async () => {
		const { findByTestId } = renderComponent();

		const dialog = await findByTestId('promotion-unresolved-dialog');
		expect(dialog).toHaveTextContent('Apply 3 changes?');
		expect(dialog).toHaveTextContent('Billing database');
		expect(await findByTestId('promotion-unresolved-confirm')).toHaveTextContent('Apply 3 changes');
	});

	it('should confirm and cancel', async () => {
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('promotion-unresolved-confirm'));
		await userEvent.click(await findByTestId('promotion-unresolved-cancel'));

		expect(emitted('confirm')).toHaveLength(1);
		expect(emitted('cancel')).toHaveLength(1);
	});
});
