import type { PromotionPromoteCheck } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { promoted } from '../__tests__/bindings.fixtures';
import {
	deletedWorkflowWarning,
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
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

const promoteResult = (branchName = 'main') =>
	promoted({ git: { commitSha: 'abc123', branchName } });

const REVISION = 'a'.repeat(64);

const promoteCheck = (fields: Partial<PromotionPromoteCheck> = {}): PromotionPromoteCheck => ({
	missingDependencies: [],
	warnings: [],
	revision: REVISION,
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
		const statusOf = (row: HTMLElement) =>
			within(row).queryByTestId('promotion-missing-dependency-status');
		/** The name and the summary of each row. `statuses` reads the status of each row. */
		const rows = (getAllByTestId: (id: string) => HTMLElement[]) =>
			getAllByTestId('promotion-missing-dependency').map((row) =>
				[...row.children]
					.filter((part) => part !== statusOf(row))
					.map((part) => part.textContent)
					.join('')
					.trim(),
			);
		const statuses = (getAllByTestId: (id: string) => HTMLElement[]) =>
			getAllByTestId('promotion-missing-dependency').map(
				(row) => statusOf(row)?.textContent?.trim() ?? null,
			);

		it('reads the check of the environment and shows nothing more when nothing is missing', async () => {
			const { findByTestId, getByRole, getByTestId, queryByTestId } = renderComponent();

			expect(await findByTestId('promote-commit-message')).toBeVisible();
			await waitFor(() =>
				expect(api.fetchPromoteCheck).toHaveBeenCalledWith(expect.anything(), 'environment-1'),
			);
			expect(queryByTestId('promote-missing-dependencies')).not.toBeInTheDocument();
			expect(getByRole('heading', { name: 'Promote changes to Production' })).toBeVisible();
			expect(getByTestId('promote-confirm-button')).toHaveTextContent(/^Promote$/);
		});

		it('asks the user to confirm the missing dependencies, and lists the warnings apart, above the commit message', async () => {
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
			const { findByTestId, findByRole, getAllByTestId, getByTestId } = renderComponent();

			const section = await findByTestId('promote-missing-dependencies');
			// The title and the button count what the user confirms. A warning needs no confirmation.
			expect(
				await findByRole('heading', { name: 'Promote with 2 unresolved dependencies?' }),
			).toBeVisible();
			expect(getByTestId('promote-confirm-button')).toHaveTextContent(
				/^Promote with 2 unresolved dependencies$/,
			);
			expect(getByTestId('promote-confirm-button')).toBeEnabled();
			expect(section).toHaveTextContent(
				'These dependencies are not on the branch after this Promote. Workflows that use them cannot be published where this is applied until the dependencies exist there.',
			);
			expect(section).toHaveTextContent(
				'These dependencies do not exist on this instance. Workflows that use them fail where this is applied.',
			);
			const [unresolved, warnings] = getAllByTestId('promotion-missing-dependency-list');
			expect(rows((id) => within(unresolved).getAllByTestId(id))).toEqual([
				'CRM keyCredential · Used by Invoice reconciliation',
				'Send audit logWorkflow · Used by Invoice reconciliation, Payment reminders +2',
			]);
			expect(rows((id) => within(warnings).getAllByTestId(id))).toEqual([
				'Archive invoicesWorkflow · Used by Invoice reconciliation',
			]);
			expect(
				section.compareDocumentPosition(getByTestId('promote-commit-message')) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
			expect(section).not.toHaveTextContent('Promote stops');
		});

		it('sends the confirmation with the revision of the check that the user saw', async () => {
			const missingDependencies = [otherProjectCredential, personalWorkflow];
			api.fetchPromoteCheck.mockResolvedValue(promoteCheck({ missingDependencies }));
			api.promotePackage.mockResolvedValue(promoted({ missingDependencies }));
			const { findByTestId, getByTestId } = renderComponent();
			await findByTestId('promote-missing-dependencies');

			await userEvent.type(getByTestId('promote-commit-message'), 'Deploy today');
			await userEvent.click(getByTestId('promote-confirm-button'));

			await waitFor(() =>
				expect(api.promotePackage).toHaveBeenCalledWith(expect.anything(), 'environment-1', {
					commitMessage: 'Deploy today',
					confirmMissingDependencies: true,
					expectedPreviewRevision: REVISION,
				}),
			);
			// The result says what the Promote left out.
			expect(await findByTestId('promote-result-summary')).toHaveTextContent('Pushed to main.');
			expect(getByTestId('promote-result-not-included')).toHaveTextContent(
				/^2 dependencies are not included\.$/,
			);
		});

		it('asks for no confirmation when the check has only warnings', async () => {
			api.fetchPromoteCheck.mockResolvedValue(promoteCheck({ warnings: [deletedWorkflowWarning] }));
			api.promotePackage.mockResolvedValue(promoteResult('main'));
			const { findByTestId, getByRole, getByTestId, queryByTestId } = renderComponent();

			expect(await findByTestId('promote-missing-dependencies')).toHaveTextContent(
				'These dependencies do not exist on this instance.',
			);
			expect(getByRole('heading', { name: 'Promote changes to Production' })).toBeVisible();
			expect(getByTestId('promote-confirm-button')).toHaveTextContent(/^Promote$/);

			await userEvent.click(getByTestId('promote-confirm-button'));

			await waitFor(() =>
				expect(api.promotePackage).toHaveBeenCalledWith(expect.anything(), 'environment-1', {}),
			);
			expect(await findByTestId('promote-result-summary')).toBeVisible();
			expect(queryByTestId('promote-result-not-included')).not.toBeInTheDocument();
		});

		it.each([
			{
				status: 'missing-dependencies' as const,
				missingDependencies: [otherProjectCredential, outsideAccessWorkflow],
				warnings: [],
			},
			{ status: 'preview-changed' as const },
		])('stays open and shows the new list when the Promote answers $status', async (fields) => {
			const newRevision = 'b'.repeat(64);
			api.fetchPromoteCheck
				.mockResolvedValueOnce(promoteCheck({ missingDependencies: [otherProjectCredential] }))
				.mockResolvedValue(
					promoteCheck({
						missingDependencies: [otherProjectCredential, outsideAccessWorkflow],
						revision: newRevision,
					}),
				);
			api.promotePackage
				.mockResolvedValueOnce({ environmentId: 'environment-1', ...fields })
				.mockResolvedValue(promoteResult('main'));
			const { findByRole, findByTestId, getByTestId, queryByTestId, emitted } = renderComponent();
			await findByRole('heading', { name: 'Promote with 1 unresolved dependency?' });

			await userEvent.click(getByTestId('promote-confirm-button'));

			// Nothing was pushed, so the dialog shows no result.
			expect(await findByTestId('promote-missing-changed')).toHaveTextContent(
				'The list has changed. Review it before you continue.',
			);
			expect(queryByTestId('promote-result-summary')).not.toBeInTheDocument();
			expect(emitted('update:open')).toBeUndefined();
			expect(mockShowError).not.toHaveBeenCalled();
			expect(api.fetchPromoteCheck).toHaveBeenCalledTimes(2);
			expect(
				await findByRole('heading', { name: 'Promote with 2 unresolved dependencies?' }),
			).toBeVisible();
			expect(
				rows((id) => within(getByTestId('promote-missing-dependencies')).getAllByTestId(id)),
			).toHaveLength(2);

			await userEvent.click(getByTestId('promote-confirm-button'));

			await waitFor(() =>
				expect(api.promotePackage).toHaveBeenLastCalledWith(expect.anything(), 'environment-1', {
					confirmMissingDependencies: true,
					expectedPreviewRevision: newRevision,
				}),
			);
			expect(await findByTestId('promote-result-summary')).toBeVisible();
		});

		it('sends no confirmation while the check loads', async () => {
			api.fetchPromoteCheck.mockReturnValue(new Promise(() => {}));
			api.promotePackage.mockResolvedValue(promoteResult('main'));
			const { findByTestId, getByTestId } = renderComponent();
			await findByTestId('promote-check-loading');

			await userEvent.click(getByTestId('promote-confirm-button'));

			await waitFor(() =>
				expect(api.promotePackage).toHaveBeenCalledWith(expect.anything(), 'environment-1', {}),
			);
			expect(await findByTestId('promote-result-summary')).toBeVisible();
		});

		it('shows the list of the answer when the check fails and the Promote finds missing dependencies', async () => {
			api.fetchPromoteCheck.mockRejectedValue(new Error('The check is not available'));
			api.promotePackage
				.mockResolvedValueOnce({
					status: 'missing-dependencies',
					environmentId: 'environment-1',
					missingDependencies: [otherProjectCredential],
					warnings: [deletedWorkflowWarning],
				})
				.mockResolvedValue(promoted({ missingDependencies: [otherProjectCredential] }));
			const { findByRole, findByTestId, getAllByTestId, getByTestId, queryByTestId } =
				renderComponent();
			await waitFor(() => expect(queryByTestId('promote-check-loading')).not.toBeInTheDocument());

			await userEvent.click(getByTestId('promote-confirm-button'));

			// The user confirmed nothing, because the dialog showed no list.
			expect(api.promotePackage).toHaveBeenLastCalledWith(expect.anything(), 'environment-1', {});
			expect(await findByTestId('promote-missing-changed')).toBeVisible();
			expect(
				await findByRole('heading', { name: 'Promote with 1 unresolved dependency?' }),
			).toBeVisible();
			expect(rows(getAllByTestId)).toEqual([
				'CRM keyCredential · Used by Invoice reconciliation',
				'Archive invoicesWorkflow · Used by Invoice reconciliation',
			]);
			expect(queryByTestId('promote-result-summary')).not.toBeInTheDocument();

			await userEvent.click(getByTestId('promote-confirm-button'));

			// The answer has no revision, so the confirmation covers the list when the Promote runs.
			await waitFor(() =>
				expect(api.promotePackage).toHaveBeenLastCalledWith(expect.anything(), 'environment-1', {
					confirmMissingDependencies: true,
				}),
			);
			expect(await findByTestId('promote-result-not-included')).toHaveTextContent(
				'1 dependency is not included.',
			);
		});

		it('does not show the project of a dependency or of the workflows that use it', async () => {
			api.fetchPromoteCheck.mockResolvedValue(
				promoteCheck({
					missingDependencies: [
						{ ...otherProjectCredential, project: { id: 'p2', name: 'Finance' } },
						outsideAccessWorkflow,
					],
				}),
			);
			const { findByTestId } = renderComponent();

			const list = await findByTestId('promotion-missing-dependency-list');
			expect(within(list).getByText('CRM key')).toBeVisible();
			// "Billing" is the project of the workflows. "Finance" is the project of "CRM key".
			expect(list).not.toHaveTextContent('Billing');
			expect(list).not.toHaveTextContent('Finance');
			expect(list).not.toHaveTextContent(/project|owner/i);
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

		it('says for each dependency if the user can access it, and when a personal project holds it', async () => {
			api.fetchPromoteCheck.mockResolvedValue(
				promoteCheck({
					missingDependencies: [otherProjectCredential, outsideAccessWorkflow, personalCredential],
					warnings: [deletedWorkflowWarning],
				}),
			);
			const { findByTestId, getAllByTestId } = renderComponent();

			await findByTestId('promote-missing-dependencies');
			// A warning has no status.
			expect(statuses(getAllByTestId)).toEqual([
				'Not included',
				'No access',
				'Personal project',
				null,
			]);
			expect(rows(getAllByTestId)).toEqual([
				'CRM keyCredential · Used by Invoice reconciliation',
				'Send audit logWorkflow · Used by Invoice reconciliation, Weekly KPI report',
				'Personal GmailCredential · Used by Weekly KPI report',
				'Archive invoicesWorkflow · Used by Invoice reconciliation',
			]);
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
