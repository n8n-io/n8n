import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
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
		// Everything published, so the report stays a success.
		api.applyPromotion.mockResolvedValue({
			...applied,
			counts: {
				...applied.counts,
				projects: { created: 1, updated: 0, skipped: 0, deleted: 2 },
				workflows: {
					...applied.counts.workflows,
					publishing: { published: 3, unpublished: 0, unchanged: 0, blocked: 0, failed: 0 },
				},
			},
		});
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		// The whole-branch apply carries no expectedSource, so the branch tip is applied.
		await waitFor(() =>
			expect(api.applyPromotion).toHaveBeenCalledWith(expect.anything(), 'connection-1'),
		);
		// Project counts are reported too, because an instance apply can delete projects.
		expect(mockShowMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'success',
				title: 'Instance updated',
				message:
					'Projects: 1 created, 2 deleted. Workflows: 1 created, 2 updated, 0 archived, 0 deleted.',
			}),
		);
		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
	});

	it('reloads the project list after a successful apply', async () => {
		api.applyPromotion.mockResolvedValue(applied);
		const projectsStore = useProjectsStore();
		const { findByTestId } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		await waitFor(() => expect(projectsStore.getMyProjects).toHaveBeenCalledTimes(1));
		expect(projectsStore.getProjectsCount).toHaveBeenCalledTimes(1);
		// This user cannot list every project, so the full list is not loaded.
		expect(projectsStore.getAllProjects).not.toHaveBeenCalled();
	});

	it('also reloads all projects when the user can list them', async () => {
		api.applyPromotion.mockResolvedValue(applied);
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.globalProjectPermissions = { list: true };
		const { findByTestId } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		await waitFor(() => expect(projectsStore.getAllProjects).toHaveBeenCalledTimes(1));
		expect(projectsStore.getMyProjects).toHaveBeenCalledTimes(1);
	});

	it('reports success when the project list cannot be reloaded', async () => {
		api.applyPromotion.mockResolvedValue(applied);
		const projectsStore = useProjectsStore();
		vi.mocked(projectsStore.getMyProjects).mockRejectedValue(new Error('network'));
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		await waitFor(() => expect(projectsStore.getMyProjects).toHaveBeenCalled());
		expect(mockShowError).not.toHaveBeenCalled();
		expect(mockShowMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Instance updated' }),
		);
		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
	});

	it('reloads the project list after the binding flow applies', async () => {
		api.applyPromotion.mockResolvedValue(blocked({ missingBindings: [credential] }));
		const projectsStore = useProjectsStore();
		const { findByTestId, emitted } = renderComponent({
			global: {
				stubs: {
					PromotionBindingsFlow: defineComponent({
						emits: ['applied'],
						setup:
							(_, { emit }) =>
							() =>
								h('button', {
									'data-test-id': 'stub-applied',
									onClick: () => emit('applied', applied),
								}),
					}),
				},
			},
		});

		await userEvent.click(await findByTestId('apply-confirm-button'));
		await userEvent.click(await findByTestId('stub-applied'));

		await waitFor(() => expect(projectsStore.getMyProjects).toHaveBeenCalledTimes(1));
		expect(projectsStore.getProjectsCount).toHaveBeenCalledTimes(1);
		expect(mockShowMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Instance updated' }),
		);
		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
	});

	it('warns when applied workflows could not be published', async () => {
		// The fixture imports two workflows that stayed blocked or failed to publish.
		api.applyPromotion.mockResolvedValue(applied);
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('apply-confirm-button'));

		await waitFor(() =>
			expect(mockShowMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					title: 'Instance updated',
					message:
						'Projects: 0 created, 0 deleted. Workflows: 1 created, 2 updated, 0 archived, 0 deleted. 2 could not be published.',
				}),
			),
		);
		expect(mockShowMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
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
				expect.objectContaining({
					type: 'warning',
					title: 'Apply paused',
					message:
						'The main branch changed before Apply finished. Start Apply again to use the latest version.',
				}),
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
