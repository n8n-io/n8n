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

	it('should show status badges', async () => {
		const { getByText } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await waitFor(() => {
			expect(getByText('Modified')).toBeInTheDocument();
			expect(getByText('New')).toBeInTheDocument();
		});
	});

	it('should show dependency counts', async () => {
		const { getAllByTestId } = renderComponent({
			pinia,
			props: {
				modalName: PROMOTION_SELECT_MODAL_KEY,
				data: { projectId: 'project-1' },
			},
		});

		await waitFor(() => {
			const rows = getAllByTestId('promotion-change-row');
			expect(rows[0].textContent).toContain('7 dependencies');
			expect(rows[1].textContent).toContain('2 dependencies');
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

	it('should call select all when clicking select all checkbox', async () => {
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
	});
});
