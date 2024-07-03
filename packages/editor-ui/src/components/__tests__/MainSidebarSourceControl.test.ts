import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import { SOURCE_CONTROL_PULL_MODAL_KEY, STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import MainSidebarSourceControl from '@/components/MainSidebarSourceControl.vue';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useRBACStore } from '@/stores/rbac.store';
import { createComponentRenderer } from '@/__tests__/render';

let pinia: ReturnType<typeof createTestingPinia>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;
let uiStore: ReturnType<typeof useUIStore>;
let rbacStore: ReturnType<typeof useRBACStore>;

const renderComponent = createComponentRenderer(MainSidebarSourceControl);

describe('MainSidebarSourceControl', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});

		rbacStore = useRBACStore(pinia);
		vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);

		sourceControlStore = useSourceControlStore();
		vi.spyOn(sourceControlStore, 'isEnterpriseSourceControlEnabled', 'get').mockReturnValue(true);

		uiStore = useUIStore();
	});

	it('should render nothing when not instance owner', async () => {
		vi.spyOn(rbacStore, 'hasScope').mockReturnValue(false);
		const { container } = renderComponent({ pinia, props: { isCollapsed: false } });
		expect(container).toBeEmptyDOMElement();
	});

	it('should render empty content when instance owner but not connected', async () => {
		const { getByTestId } = renderComponent({ pinia, props: { isCollapsed: false } });
		expect(getByTestId('main-sidebar-source-control')).toBeInTheDocument();
		expect(getByTestId('main-sidebar-source-control')).toBeEmptyDOMElement();
	});

	describe('when connected', () => {
		beforeEach(() => {
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchName: 'main',
				branches: [],
				repositoryUrl: '',
				branchReadOnly: false,
				branchColor: '#5296D6',
				connected: true,
				publicKey: '',
			});
		});

		it('should render the appropriate content', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});
			expect(getByTestId('main-sidebar-source-control-connected')).toBeInTheDocument();
			expect(queryByTestId('main-sidebar-source-control-setup')).not.toBeInTheDocument();
		});

		it('should show toast error if pull response http status code is not 409', async () => {
			vi.spyOn(sourceControlStore, 'pullWorkfolder').mockRejectedValueOnce({
				response: { status: 400 },
			});
			const { getAllByRole, getByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[0]);
			await waitFor(() => expect(getByRole('alert')).toBeInTheDocument());
		});

		it('should show confirm if pull response http status code is 409', async () => {
			const status = {};
			vi.spyOn(sourceControlStore, 'pullWorkfolder').mockRejectedValueOnce({
				response: { status: 409, data: { data: status } },
			});
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { getAllByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[0]);
			await waitFor(() =>
				expect(openModalSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						name: SOURCE_CONTROL_PULL_MODAL_KEY,
						data: expect.objectContaining({
							status,
						}),
					}),
				),
			);
		});
	});
});
