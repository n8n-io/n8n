import type { PromotePackageResultDto, PromotionPromoteCheck } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import {
	deletedWorkflowWarning,
	otherProjectCredential,
	outsideAccessWorkflow,
	personalWorkflow,
	usedBy,
} from '../__tests__/missingDependencies.fixtures';
import type * as PromotionsApi from '../promotionsSettings.api';
import PromoteInstanceDialog from './PromoteInstanceDialog.vue';

const api = vi.hoisted(() => ({
	promotePackage: vi.fn<typeof PromotionsApi.promotePackage>(),
	fetchPromoteCheck: vi.fn<typeof PromotionsApi.fetchPromoteCheck>(),
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

const promoteCheck = (fields: Partial<PromotionPromoteCheck> = {}): PromotionPromoteCheck => ({
	missingDependencies: [],
	warnings: [],
	revision: 'a'.repeat(64),
	...fields,
});

const renderComponent = createComponentRenderer(PromoteInstanceDialog, {
	props: {
		open: true,
		environmentId: 'environment-1',
		baseBranchName: 'main',
		environmentName: 'Production',
		createBranchOnPromotion: false,
		providerType: 'git',
	},
});

describe('PromoteInstanceDialog', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
		api.fetchPromoteCheck.mockResolvedValue(promoteCheck());
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
		const { findByTestId, findByRole, getByTestId, queryByTestId, emitted } = renderComponent({
			props: { environmentName: 'Staging' },
		});
		expect(await findByRole('heading', { name: 'Promote changes to Staging' })).toBeVisible();

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
			// eslint-disable-next-line id-denylist -- the merge request number of the API
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

	describe('missing dependencies', () => {
		const rows = (getAllByTestId: (id: string) => HTMLElement[]) =>
			getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim());

		it('reads the check of the environment and shows nothing more when nothing is missing', async () => {
			const { findByTestId, queryByTestId } = renderComponent();

			expect(await findByTestId('promote-commit-message')).toBeVisible();
			await waitFor(() =>
				expect(api.fetchPromoteCheck).toHaveBeenCalledWith(expect.anything(), 'environment-1'),
			);
			expect(queryByTestId('promote-missing-dependencies')).not.toBeInTheDocument();
			expect(queryByTestId('promote-missing-blocking')).not.toBeInTheDocument();
		});

		it('lists the missing dependencies and the warnings above the commit message', async () => {
			api.fetchPromoteCheck.mockResolvedValue(
				promoteCheck({
					missingDependencies: [
						otherProjectCredential,
						{
							...outsideAccessWorkflow,
							consumers: usedBy(
								{ id: 'w1', name: 'Invoice reconciliation' },
								{ id: 'w2', name: 'Payment reminders' },
								{ id: 'w3', name: 'Weekly KPI report' },
								{ id: 'w4', name: 'Format currency' },
							),
						},
					],
					warnings: [deletedWorkflowWarning],
				}),
			);
			const { findByTestId, getAllByTestId, getByTestId, queryByTestId } = renderComponent();

			const section = await findByTestId('promote-missing-dependencies');
			expect(section).toHaveTextContent(
				'The workflows of this Promote use these dependencies. The branch does not hold them after this Promote.',
			);
			expect(rows(getAllByTestId)).toEqual([
				'CRM keyCredential · Used by Invoice reconciliation',
				'Send audit logWorkflow · Used by Invoice reconciliation, Payment reminders +2',
				'Archive invoicesWorkflow · Used by Invoice reconciliation',
			]);
			expect(
				section.compareDocumentPosition(getByTestId('promote-commit-message')) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
			// Nothing in the list stops the Promote.
			expect(queryByTestId('promote-missing-blocking')).not.toBeInTheDocument();
			expect(getByTestId('promote-confirm-button')).toBeEnabled();
		});

		it('does not show the project of a dependency or of the workflows that use it', async () => {
			api.fetchPromoteCheck.mockResolvedValue(
				promoteCheck({ missingDependencies: [otherProjectCredential, outsideAccessWorkflow] }),
			);
			const { findByTestId } = renderComponent();

			const list = await findByTestId('promotion-missing-dependency-list');
			expect(within(list).getByText('CRM key')).toBeVisible();
			// "Billing" is the project of the workflows. The API sends no project for the dependency.
			expect(list).not.toHaveTextContent('Billing');
			expect(list).not.toHaveTextContent(/project|owner/i);
		});

		it('names the references that stop the Promote, and still lets the user promote', async () => {
			api.fetchPromoteCheck.mockResolvedValue(
				promoteCheck({
					missingDependencies: [otherProjectCredential, personalWorkflow],
					warnings: [{ ...deletedWorkflowWarning, blocking: true }],
				}),
			);
			api.promotePackage.mockResolvedValue(promoteResult('main'));
			const { findByTestId, getByTestId } = renderComponent();

			expect(await findByTestId('promote-missing-blocking')).toHaveTextContent(
				'Promote stops on these references: "Draft helper", "Archive invoices". Move the workflows to a team project, or remove the references to workflows that no longer exist. Then promote again.',
			);
			expect(getByTestId('promote-confirm-button')).toBeEnabled();

			await userEvent.click(getByTestId('promote-confirm-button'));
			await waitFor(() =>
				expect(api.promotePackage).toHaveBeenCalledWith(expect.anything(), 'environment-1', {}),
			);
		});

		it('tells the user to remove a reference to a workflow that no longer exists', async () => {
			api.fetchPromoteCheck.mockResolvedValue(
				promoteCheck({ warnings: [{ ...deletedWorkflowWarning, blocking: true }] }),
			);
			const { findByTestId } = renderComponent();

			expect(await findByTestId('promote-missing-blocking')).toHaveTextContent(
				'Promote stops on this reference: "Archive invoices". Move the workflow to a team project, or remove the reference if the workflow no longer exists. Then promote again.',
			);
		});

		it('shows a loading row while the check runs, then the list in the same status region', async () => {
			let resolveCheck: (check: PromotionPromoteCheck) => void = () => {};
			api.fetchPromoteCheck.mockReturnValue(
				new Promise((resolve) => {
					resolveCheck = resolve;
				}),
			);
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			const loading = await findByTestId('promote-check-loading');
			expect(loading).toHaveTextContent('Checking the dependencies of this Promote…');
			const region = loading.closest('[role="status"]');
			expect(region).toBeInTheDocument();
			expect(queryByTestId('promote-missing-dependencies')).not.toBeInTheDocument();
			// The check does not stop the user.
			expect(getByTestId('promote-confirm-button')).toBeEnabled();
			expect(getByTestId('promote-commit-message')).toBeEnabled();

			resolveCheck(promoteCheck({ missingDependencies: [otherProjectCredential] }));

			expect(region).toContainElement(await findByTestId('promote-missing-dependencies'));
			expect(queryByTestId('promote-check-loading')).not.toBeInTheDocument();
		});

		it.each([
			['finds nothing', async () => promoteCheck()],
			[
				'fails',
				async () => {
					throw new Error('The check is not available');
				},
			],
		])('removes the loading row when the check %s', async (_case, settle) => {
			let endCheck = () => {};
			const pending = new Promise<void>((resolve) => {
				endCheck = resolve;
			});
			api.fetchPromoteCheck.mockImplementation(async () => {
				await pending;
				return await settle();
			});
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();
			expect(await findByTestId('promote-check-loading')).toBeVisible();

			endCheck();

			await waitFor(() => expect(queryByTestId('promote-check-loading')).not.toBeInTheDocument());
			expect(queryByTestId('promote-missing-dependencies')).not.toBeInTheDocument();
			expect(getByTestId('promote-confirm-button')).toBeEnabled();
		});

		it('shows the dialog without the list and promotes when the check fails', async () => {
			api.fetchPromoteCheck.mockRejectedValue(new Error('The check is not available'));
			api.promotePackage.mockResolvedValue(promoteResult('main'));
			const { findByTestId, getByTestId, queryByTestId } = renderComponent();

			await userEvent.type(await findByTestId('promote-commit-message'), 'Deploy today');
			expect(queryByTestId('promote-missing-dependencies')).not.toBeInTheDocument();
			expect(mockShowError).not.toHaveBeenCalled();

			await userEvent.click(getByTestId('promote-confirm-button'));
			expect(await findByTestId('promote-result-summary')).toHaveTextContent('Pushed to main.');
		});
	});
});
