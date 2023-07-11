import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import { SOURCE_CONTROL_PULL_MODAL_KEY, STORES } from '@/constants';
import { i18nInstance } from '@/plugins/i18n';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import MainSidebarSourceControl from '@/components/MainSidebarSourceControl.vue';
import { useSourceControlStore, useUIStore } from '@/stores';

let pinia: ReturnType<typeof createTestingPinia>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;
let uiStore: ReturnType<typeof useUIStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) => {
	return render(
		MainSidebarSourceControl,
		{
			pinia,
			i18n: i18nInstance,
			...renderOptions,
		},
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);
};

describe('MainSidebarSourceControl', () => {
	const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

	beforeEach(() => {
		getItemSpy.mockReturnValue('true');
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});

		sourceControlStore = useSourceControlStore();
		uiStore = useUIStore();
	});

	it('should render nothing', async () => {
		getItemSpy.mockReturnValue(null);
		const { container } = renderComponent({ props: { isCollapsed: false } });
		expect(container).toBeEmptyDOMElement();
	});

	it('should render empty content', async () => {
		const { getByTestId } = renderComponent({ props: { isCollapsed: false } });
		expect(getByTestId('main-sidebar-source-control')).toBeInTheDocument();
		expect(getByTestId('main-sidebar-source-control')).toBeEmptyDOMElement();
	});

	describe('when connected', () => {
		beforeEach(() => {
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchName: 'main',
				branches: [],
				authorName: '',
				authorEmail: '',
				repositoryUrl: '',
				branchReadOnly: false,
				branchColor: '#5296D6',
				connected: true,
				publicKey: '',
			});
		});

		it('should render the appropriate content', async () => {
			const { getByTestId, queryByTestId } = renderComponent({ props: { isCollapsed: false } });
			expect(getByTestId('main-sidebar-source-control-connected')).toBeInTheDocument();
			expect(queryByTestId('main-sidebar-source-control-setup')).not.toBeInTheDocument();
		});

		it('should show toast error if pull response http status code is not 409', async () => {
			vi.spyOn(sourceControlStore, 'pullWorkfolder').mockRejectedValueOnce({
				response: { status: 400 },
			});
			const { getAllByRole, getByRole } = renderComponent({ props: { isCollapsed: false } });

			await userEvent.click(getAllByRole('button')[0]);
			await waitFor(() => expect(getByRole('alert')).toBeInTheDocument());
		});

		it('should show confirm if pull response http status code is 409', async () => {
			const status = {};
			vi.spyOn(sourceControlStore, 'pullWorkfolder').mockRejectedValueOnce({
				response: { status: 409, data: { data: status } },
			});
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { getAllByRole, getByRole } = renderComponent({ props: { isCollapsed: false } });

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
