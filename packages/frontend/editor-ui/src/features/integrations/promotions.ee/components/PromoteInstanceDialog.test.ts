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
		environmentId: 'environment-1',
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
		environmentId: 'environment-1',
		baseBranchName: 'main',
		createBranchOnPromotion: false,
		providerType: 'git',
	},
});

describe('PromoteInstanceDialog', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
	});

	it('promotes without a commit message when the field is empty or blank', async () => {
		api.promotePackage.mockResolvedValue(promoteResult('main'));
		const { findByTestId, getByTestId } = renderComponent();

		await userEvent.type(await findByTestId('promote-commit-message'), '   ');
		expect(getByTestId('promote-confirm-button')).toBeEnabled();
		await userEvent.click(getByTestId('promote-confirm-button'));

		await waitFor(() =>
			expect(api.promotePackage).toHaveBeenCalledWith(expect.anything(), 'environment-1', {}),
		);
	});

	it('promotes with the trimmed message and shows the result in the dialog', async () => {
		api.promotePackage.mockResolvedValue(promoteResult('main'));
		const { findByTestId, getByTestId, queryByTestId, emitted } = renderComponent();

		await userEvent.type(await findByTestId('promote-commit-message'), '  Deploy today  ');
		await userEvent.click(getByTestId('promote-confirm-button'));

		await waitFor(() =>
			expect(api.promotePackage).toHaveBeenCalledWith(expect.anything(), 'environment-1', {
				commitMessage: 'Deploy today',
			}),
		);
		expect(mockShowMessage).not.toHaveBeenCalled();
		expect(emitted('update:open')).toBeUndefined();
		expect(await findByTestId('promote-result-summary')).toHaveTextContent('Pushed to main.');
		expect(getByTestId('promote-close-button')).toBeInTheDocument();
		expect(queryByTestId('promote-confirm-button')).not.toBeInTheDocument();
		expect(queryByTestId('promote-cancel-button')).not.toBeInTheDocument();
	});

	it('links the merge request n8n wrote and leaves URLs in GitLab warnings as text', async () => {
		api.promotePackage.mockResolvedValue({
			...promoteResult('n8n-promotion/2026-01-01T00-00-00-000Z'),
			review: { reviewId: 'review-1', number: 3, webUrl: 'https://gitlab.example/mr/3' },
			warnings: [
				{
					message:
						'The branch feature was pushed, but no merge request was opened: see https://gitlab.example/help',
					linkUrl: 'javascript:alert(1)',
				},
				{
					message: 'ignored by the ui',
					linkUrl: 'https://gitlab.example/mr/9',
				},
			],
		});
		const { findByTestId, getByTestId, getAllByTestId, queryByTestId } = renderComponent();

		await userEvent.type(await findByTestId('promote-commit-message'), 'Deploy today');
		await userEvent.click(getByTestId('promote-confirm-button'));

		const link = await findByTestId('promote-merge-request-link');
		expect(link).toHaveAttribute('href', 'https://gitlab.example/mr/3');
		expect(link).toHaveAttribute('target', '_blank');
		expect(queryByTestId('promote-result-summary')).not.toBeInTheDocument();
		const warnings = getAllByTestId('promote-warning');
		expect(warnings[0]).toHaveTextContent('see https://gitlab.example/help');
		expect(warnings[0]?.querySelector('a')).toBeNull();
		const recordedLink = warnings[1]?.querySelector('a');
		expect(recordedLink).toHaveAttribute('href', 'https://gitlab.example/mr/9');
		expect(warnings[1]).toHaveTextContent(
			'The merge request https://gitlab.example/mr/9 was opened, but n8n could not record the review. Review it on GitLab.',
		);
		expect(warnings[1]).not.toHaveTextContent('ignored by the ui');
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
