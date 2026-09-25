import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { applied, blocked, credential, variable } from '../__tests__/bindings.fixtures';
import type * as PromotionsApi from '../promotionsSettings.api';
import ApplyInstanceDialog from './ApplyInstanceDialog.vue';

const api = vi.hoisted(() => ({
	applyPromotion: vi.fn<typeof PromotionsApi.applyPromotion>(),
	continueApplyPromotion: vi.fn<typeof PromotionsApi.continueApplyPromotion>(),
	continueApplyProjectSelection: vi.fn<typeof PromotionsApi.continueApplyProjectSelection>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

const renderComponent = createComponentRenderer(ApplyInstanceDialog, {
	props: { open: true, connectionId: 'connection-1', branchName: 'main' },
});

describe('ApplyInstanceDialog', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
	});

	it('applies the whole branch and reports success', async () => {
		api.applyPromotion.mockResolvedValue(applied);
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		// The whole-branch apply carries no expectedSource, so the branch tip is applied.
		await waitFor(() =>
			expect(api.applyPromotion).toHaveBeenCalledWith(expect.anything(), 'connection-1'),
		);
		expect(mockShowMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success', title: 'Instance updated' }),
		);
		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
	});

	it('opens the whole-branch binding flow when apply is blocked', async () => {
		api.applyPromotion.mockResolvedValue(blocked({ missingBindings: [credential, variable] }));
		const { findByTestId, findByText, findAllByText, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		await findByText('Resolve bindings');
		await findAllByText(credential.name);
		await findAllByText(variable.name);
		// The flow stays open; no success reported and the dialog is not dismissed yet.
		expect(mockShowMessage).not.toHaveBeenCalled();
		expect(emitted('update:open')).toBeUndefined();
	});

	it('warns and closes when the source changed', async () => {
		api.applyPromotion.mockResolvedValue({
			status: 'source-changed',
			connectionId: 'connection-1',
			configId: 'config-apply',
			git: { branchName: 'main', commitSha: 'b'.repeat(40) },
		});
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		await waitFor(() =>
			expect(mockShowMessage).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'warning', title: 'Apply paused' }),
			),
		);
		expect(mockShowMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
	});

	it('shows an error and stays open when the apply fails', async () => {
		const failure = new Error('git is unreachable');
		api.applyPromotion.mockRejectedValueOnce(failure);
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(failure, expect.any(String)));
		expect(mockShowMessage).not.toHaveBeenCalled();
		expect(emitted('update:open')).toBeUndefined();
	});
});
