import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import PromotionSelectModal from './PromotionSelectModal.vue';
import { PROMOTION_SELECT_MODAL_KEY } from '../promotions.constants';
import { promotionEventBus } from '../promotions.eventBus';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, Response, type Request } from 'miragejs';
import { useUsersStore } from '@n8n/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants/modals';

const { confirm, showMessage, showError } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const mockChanges = [
	{
		id: 'wf-001',
		name: 'Email summary',
		type: 'workflow' as const,
		status: 'modified' as const,
		version: 14,
		updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		updatedBy: 'user-001',
		dependencyCount: 7,
	},
	{
		id: 'wf-002',
		name: 'Payment Handler',
		type: 'workflow' as const,
		status: 'new' as const,
		version: 1,
		updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
		updatedBy: 'user-002',
		dependencyCount: 2,
	},
];

/** The endpoint wraps the rows with the commit they were read from. */
const changesBody = (changes: unknown[]) => ({ commitSha: 'a'.repeat(40), changes });

const renderComponent = createComponentRenderer(PromotionSelectModal, {
	global: {
		stubs: {
			Modal: {
				template: `
					<div>
						<slot name="content" />
						<slot name="footer" />
					</div>
				`,
			},
		},
	},
});

describe('PromotionSelectModal', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let server: ReturnType<typeof createServer>;

	beforeEach(() => {
		pinia = createTestingPinia();
		vi.clearAllMocks();
		server = createServer({ environment: 'test' });
		server.get('/rest/promotions/project-1/changes/promote', () => ({
			data: changesBody(mockChanges),
		}));

		const usersStore = useUsersStore();
		usersStore.usersById = {
			'user-001': { id: 'user-001', firstName: 'Fabian', lastName: 'Mueller' },
			'user-002': { id: 'user-002', firstName: 'Sandra', lastName: 'Zollner' },
		} as unknown as typeof usersStore.usersById;
	});

	afterEach(() => server.shutdown());

	it('should render change list after loading', async () => {
		server.get('/rest/promotions/project-1/changes/promote', () => ({
			data: changesBody([
				{ ...mockChanges[0], status: 'renamed' },
				{ ...mockChanges[1], status: 'renamed-and-modified' },
			]),
		}));
		const { getByText } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await waitFor(() => {
			expect(getByText('Email summary')).toBeInTheDocument();
			expect(getByText('Payment Handler')).toBeInTheDocument();
			expect(getByText('Moved / renamed')).toBeInTheDocument();
			expect(getByText('Moved / renamed and modified')).toBeInTheDocument();
		});
	});

	it('should disable promote button when nothing selected', async () => {
		const { findByTestId } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		const submitButton = await findByTestId('promotion-submit');
		expect(submitButton).toBeDisabled();
	});

	it('should keep promotion unavailable after selecting a change', async () => {
		const { findAllByTestId, findByTestId } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		const rows = await findAllByTestId('promotion-change-row');
		await userEvent.click(rows[0]);

		const submitButton = await findByTestId('promotion-submit');
		expect(submitButton).toBeDisabled();
		expect(submitButton).toHaveTextContent('Promote 1 change');
	});

	it('should show changed by name', async () => {
		const { getAllByTestId } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await waitFor(() => {
			const rows = getAllByTestId('promotion-change-row');
			expect(rows[0].textContent).toContain('Changed by Fabian Mueller');
			expect(rows[1].textContent).toContain('Changed by Sandra Zollner');
		});
	});

	it('should show empty state when no changes', async () => {
		server.get('/rest/promotions/project-1/changes/promote', () => ({ data: changesBody([]) }));

		const { getByText } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await waitFor(() => {
			expect(getByText('Nothing to promote')).toBeInTheDocument();
		});
	});

	it('keeps only selections that remain after refreshing the change list', async () => {
		const { findByTestId, findByText, queryByText } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await findByText('Payment Handler');
		const selectAll = await findByTestId('promotion-select-all');
		await userEvent.click(selectAll);

		const submitButton = await findByTestId('promotion-submit');
		expect(submitButton).toBeDisabled();
		expect(submitButton.textContent).toContain('Promote 2 changes');

		server.get('/rest/promotions/project-1/changes/promote', () => ({
			data: changesBody([mockChanges[1]]),
		}));
		await userEvent.click(await findByTestId('promotion-refresh'));
		await waitFor(() => {
			expect(queryByText('Email summary')).not.toBeInTheDocument();
			expect(submitButton).toHaveTextContent('Promote 1 change');
		});
	});

	it('should show an error state with a retry action when loading fails', async () => {
		server.get(
			'/rest/promotions/project-1/changes/promote',
			() => new Response(503, {}, { message: 'Preview unavailable' }),
		);

		const { findByTestId, getByText } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await findByTestId('promotion-error');
		expect(getByText('Could not load changes')).toBeInTheDocument();

		server.get('/rest/promotions/project-1/changes/promote', () => ({
			data: changesBody(mockChanges),
		}));
		await userEvent.click(await findByTestId('promotion-retry'));

		await waitFor(() => {
			expect(getByText('Email summary')).toBeInTheDocument();
		});
	});

	it('should show a no-results state when the search excludes every change', async () => {
		const { findByTestId, getByTestId } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		const search = await findByTestId('promotion-search');
		await userEvent.type(search, 'no-such-workflow');

		await waitFor(() => {
			expect(getByTestId('promotion-no-results')).toBeInTheDocument();
		});
	});

	it('should show distinct labels for archived and deleted workflows', async () => {
		server.get('/rest/promotions/project-1/changes/promote', () => ({
			data: changesBody([
				{
					id: 'wf-archived',
					name: 'Archived workflow',
					type: 'workflow',
					status: 'archived',
					version: 3,
					updatedAt: new Date().toISOString(),
					updatedBy: null,
					dependencyCount: 0,
				},
				{
					id: 'wf-deleted',
					name: 'Deleted workflow',
					type: 'workflow',
					status: 'deleted',
					version: null,
					updatedAt: null,
					updatedBy: null,
					dependencyCount: 0,
				},
			]),
		}));

		const { getAllByTestId } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await waitFor(() => {
			const statuses = getAllByTestId('promotion-change-status').map((el) => el.textContent);
			expect(statuses).toEqual(['Will be archived', 'Will be deleted']);
		});
	});

	describe('apply direction', () => {
		const applyProps = {
			modalName: PROMOTION_SELECT_MODAL_KEY,
			data: {
				projectId: 'project-1',
				direction: 'apply' as const,
				apply: { connectionId: 'connection-1', configId: 'config-1', branchName: 'main' },
			},
		};
		const applyChanges = vi.fn(() => ({ data: changesBody(mockChanges) }));
		const publishing = { published: 2, unpublished: 0, unchanged: 0, blocked: 0, failed: 0 };
		const applyPackage = vi.fn((_schema: unknown, request: Request) => ({
			receivedBody: JSON.parse(request.requestBody),
			connectionId: 'connection-1',
			configId: 'config-1',
			status: 'applied',
			counts: { workflows: { created: 1, updated: 1, archived: 0, deleted: 0, publishing } },
			warnings: [],
			git: { commitSha: 'a'.repeat(40), branchName: 'main' },
		}));

		let applied: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			server.get('/rest/promotions/project-1/changes/apply', applyChanges);
			server.post('/api/v1/promotions/connections/connection-1/apply', applyPackage);
			confirm.mockResolvedValue(MODAL_CONFIRM);
			applied = vi.spyOn(promotionEventBus, 'emit');
		});

		it('should offer to apply all changes instead of promoting', async () => {
			const { findByTestId, queryByTestId } = renderComponent({ pinia, props: applyProps });

			expect(await findByTestId('promotion-apply-all')).toHaveTextContent('Apply all changes');
			expect(queryByTestId('promotion-submit')).not.toBeInTheDocument();
			expect(applyChanges).toHaveBeenCalledTimes(1);
		});

		it('should not apply when the user cancels the confirmation', async () => {
			confirm.mockResolvedValue(MODAL_CANCEL);
			const { findByTestId, findByText } = renderComponent({ pinia, props: applyProps });
			await findByText('Payment Handler');

			await userEvent.click(await findByTestId('promotion-apply-all'));

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(applyPackage).not.toHaveBeenCalled();
		});

		it('should apply the branch, report the counts and close the modal', async () => {
			const { findByTestId, findByText } = renderComponent({ pinia, props: applyProps });
			await findByText('Payment Handler');

			await userEvent.click(await findByTestId('promotion-apply-all'));

			await waitFor(() => expect(applyPackage).toHaveBeenCalledTimes(1));
			// The reviewed commit travels with the request, so a moved branch is not applied blindly.
			expect(applyPackage.mock.results[0].value.receivedBody).toEqual({
				expectedSource: { configId: 'config-1', branchName: 'main', commitSha: 'a'.repeat(40) },
			});
			await waitFor(() =>
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'success',
						message: '1 created, 1 updated, 0 archived, 0 deleted.',
					}),
				),
			);
			await waitFor(() =>
				expect(useUIStore().closeModal).toHaveBeenCalledWith(PROMOTION_SELECT_MODAL_KEY),
			);
			// A closed modal has no list to refresh; the open views learn about the apply instead.
			expect(applyChanges).toHaveBeenCalledTimes(1);
			expect(applied).toHaveBeenCalledWith('applied');
		});

		it('should warn when applied workflows could not be published', async () => {
			server.post('/api/v1/promotions/connections/connection-1/apply', () => ({
				connectionId: 'connection-1',
				configId: 'config-1',
				status: 'applied',
				counts: {
					workflows: {
						created: 2,
						updated: 0,
						archived: 0,
						deleted: 0,
						publishing: { ...publishing, published: 0, blocked: 1, failed: 1 },
					},
				},
				warnings: [],
				git: { commitSha: 'a'.repeat(40), branchName: 'main' },
			}));
			const { findByTestId, findByText } = renderComponent({ pinia, props: applyProps });
			await findByText('Payment Handler');

			await userEvent.click(await findByTestId('promotion-apply-all'));

			await waitFor(() =>
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'warning',
						title: 'Changes applied',
						message: '2 created, 0 updated, 0 archived, 0 deleted. 2 could not be published.',
					}),
				),
			);
			// The import went through, so the views still refresh and the modal closes.
			expect(applied).toHaveBeenCalledWith('applied');
			await waitFor(() =>
				expect(useUIStore().closeModal).toHaveBeenCalledWith(PROMOTION_SELECT_MODAL_KEY),
			);
		});

		it.each([
			{
				result: { status: 'blocked', preflight: {} },
				message:
					'Some credentials or variables are not set up on this instance yet. Nothing was changed.',
			},
			{
				result: { status: 'source-changed' },
				message: 'The source changed since this preview. Refresh and review the changes again.',
			},
		])(
			'should warn and keep the modal open when apply pauses with $result.status',
			async ({ result, message }) => {
				server.post('/api/v1/promotions/connections/connection-1/apply', () => ({
					connectionId: 'connection-1',
					configId: 'config-1',
					git: { commitSha: 'a'.repeat(40), branchName: 'main' },
					...result,
				}));
				const { findByTestId, findByText } = renderComponent({ pinia, props: applyProps });
				await findByText('Payment Handler');

				await userEvent.click(await findByTestId('promotion-apply-all'));

				await waitFor(() =>
					expect(showMessage).toHaveBeenCalledWith(
						expect.objectContaining({ type: 'warning', title: 'Apply paused', message }),
					),
				);
				expect(showMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
				await waitFor(() => expect(applyChanges).toHaveBeenCalledTimes(2));
				expect(useUIStore().closeModal).not.toHaveBeenCalled();
				expect(applied).not.toHaveBeenCalled();
			},
		);

		it('should show the error and still refetch the changes when apply fails', async () => {
			server.post(
				'/api/v1/promotions/connections/connection-1/apply',
				() => new Response(409, {}, { message: 'Bindings unresolved' }),
			);
			const { findByTestId, findByText } = renderComponent({ pinia, props: applyProps });
			await findByText('Payment Handler');

			await userEvent.click(await findByTestId('promotion-apply-all'));

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(expect.anything(), 'Could not apply the changes'),
			);
			await waitFor(() => expect(applyChanges).toHaveBeenCalledTimes(2));
			expect(showMessage).not.toHaveBeenCalled();
		});
	});
});
