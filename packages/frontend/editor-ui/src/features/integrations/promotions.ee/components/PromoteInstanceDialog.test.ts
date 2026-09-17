import type { PromotePackageResultDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import type * as PromotionsApi from '../promotionsSettings.api';
import PromoteInstanceDialog from './PromoteInstanceDialog.vue';

const api = vi.hoisted(() => ({
	promotePackage: vi.fn<typeof PromotionsApi.promotePackage>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

const promoteResult = (branchName = 'main'): PromotePackageResultDto =>
	({
		connectionId: 'connection-1',
		configId: 'config-promote',
		counts: {
			workflows: 12,
			folders: 2,
			credentials: 5,
			dataTables: 0,
			variables: 3,
			tags: 1,
		},
		git: { commitSha: 'abc123', branchName },
	}) as unknown as PromotePackageResultDto;

const renderComponent = createComponentRenderer(PromoteInstanceDialog, {
	props: {
		open: true,
		connectionId: 'connection-1',
		baseBranchName: 'main',
		createBranchOnPromotion: false,
	},
});

describe('PromoteInstanceDialog', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
	});

	it('keeps Promote disabled until a commit message is entered', async () => {
		const { findByTestId, getByTestId } = renderComponent();

		const input = await findByTestId('promote-commit-message');
		expect(getByTestId('promote-confirm-button')).toBeDisabled();

		await userEvent.type(input, '   ');
		expect(getByTestId('promote-confirm-button')).toBeDisabled();

		await userEvent.type(input, 'Deploy today');
		expect(getByTestId('promote-confirm-button')).toBeEnabled();
	});

	it('promotes with the trimmed message and reports success', async () => {
		api.promotePackage.mockResolvedValue(promoteResult('main'));
		const { findByTestId, getByTestId, emitted } = renderComponent();

		await userEvent.type(await findByTestId('promote-commit-message'), 'Deploy today');
		await userEvent.click(getByTestId('promote-confirm-button'));

		await waitFor(() =>
			expect(api.promotePackage).toHaveBeenCalledWith(expect.anything(), 'connection-1', {
				commitMessage: 'Deploy today',
			}),
		);
		expect(mockShowMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
	});

	it('shows an error and stays open when the push fails', async () => {
		const failure = new Error('git is unreachable');
		api.promotePackage.mockRejectedValueOnce(failure);
		const { findByTestId, getByTestId, emitted } = renderComponent();

		await userEvent.type(await findByTestId('promote-commit-message'), 'Deploy today');
		await userEvent.click(getByTestId('promote-confirm-button'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(failure, expect.any(String)));
		expect(mockShowMessage).not.toHaveBeenCalled();
		expect(emitted('update:open')).toBeUndefined();
	});
});
