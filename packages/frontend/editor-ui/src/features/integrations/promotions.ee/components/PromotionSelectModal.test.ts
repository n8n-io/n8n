import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import PromotionSelectModal from './PromotionSelectModal.vue';
import { PROMOTION_SELECT_MODAL_KEY } from '../promotions.constants';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as promotionsApi from '../promotions.api';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

vi.mock('../promotions.api');

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

	beforeEach(() => {
		pinia = createTestingPinia();
		vi.clearAllMocks();
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue(mockChanges);
		vi.mocked(promotionsApi.promoteChanges).mockResolvedValue({ branchName: 'promote/test' });

		const usersStore = useUsersStore();
		usersStore.usersById = {
			'user-001': { id: 'user-001', firstName: 'Fabian', lastName: 'Mueller' },
			'user-002': { id: 'user-002', firstName: 'Sandra', lastName: 'Zollner' },
		} as unknown as typeof usersStore.usersById;
	});

	it('should render change list after loading', async () => {
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

	it('should enable promote button after selecting a change', async () => {
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
		expect(submitButton).not.toBeDisabled();
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
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue([]);

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

	it('should select every row when clicking select all', async () => {
		const { findByTestId } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		const selectAll = await findByTestId('promotion-select-all');
		await userEvent.click(selectAll);

		const submitButton = await findByTestId('promotion-submit');
		expect(submitButton).not.toBeDisabled();
		// The label reports every mock row, proving select-all covers the whole list.
		expect(submitButton.textContent).toContain('Promote 2 changes');
	});

	it('should show an error state with a retry action when loading fails', async () => {
		vi.mocked(promotionsApi.getPromotableChanges).mockRejectedValueOnce(new Error('Network error'));

		const { findByTestId, getByText } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await findByTestId('promotion-error');
		expect(getByText('Could not load changes')).toBeInTheDocument();

		// Retry succeeds (default mock) and the list replaces the error state.
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
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue([
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
				updatedAt: new Date().toISOString(),
				updatedBy: null,
				dependencyCount: 0,
			},
		]);

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
});
