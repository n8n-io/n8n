import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@/constants';
import { i18nInstance } from '@/plugins/i18n';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import MainSidebarVersionControl from '@/components/MainSidebarVersionControl.vue';
import { useUsersStore, useVersionControlStore } from '@/stores';
import { merge } from 'lodash-es';

let pinia: ReturnType<typeof createTestingPinia>;
let versionControlStore: ReturnType<typeof useVersionControlStore>;
let usersStore: ReturnType<typeof useUsersStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) => {
	return render(
		MainSidebarVersionControl,
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

describe('MainSidebarVersionControl', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});

		versionControlStore = useVersionControlStore();
		usersStore = useUsersStore();
	});

	it('should render empty content', async () => {
		const { getByTestId } = renderComponent({ props: { isCollapsed: false } });
		expect(getByTestId('main-sidebar-version-control')).toBeInTheDocument();
		expect(getByTestId('main-sidebar-version-control')).toBeEmptyDOMElement();
	});

	it('should render setup content', async () => {
		vi.spyOn(versionControlStore, 'isEnterpriseVersionControlEnabled', 'get').mockReturnValue(true);
		vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(true);

		const { getByTestId, queryByTestId } = renderComponent({ props: { isCollapsed: false } });
		expect(getByTestId('main-sidebar-version-control-setup')).toBeInTheDocument();
		expect(queryByTestId('main-sidebar-version-control-connected')).not.toBeInTheDocument();
	});

	it('should render connected content', async () => {
		vi.spyOn(versionControlStore, 'preferences', 'get').mockReturnValue({
			branchName: 'main',
			branches: [],
			authorName: '',
			authorEmail: '',
			repositoryUrl: '',
			branchReadOnly: false,
			branchColor: '#F4A6DC',
			connected: true,
			publicKey: '',
		});

		const { getByTestId, queryByTestId } = renderComponent({ props: { isCollapsed: false } });
		expect(getByTestId('main-sidebar-version-control-connected')).toBeInTheDocument();
		expect(queryByTestId('main-sidebar-version-control-setup')).not.toBeInTheDocument();
	});
});
