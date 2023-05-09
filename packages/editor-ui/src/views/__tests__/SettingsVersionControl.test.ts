import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import { STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { i18n } from '@/plugins/i18n';
import SettingsVersionControl from '@/views/SettingsVersionControl.vue';
import { useVersionControlStore } from '@/stores/versionControl.store';

let pinia: ReturnType<typeof createTestingPinia>;
let versionControlStore: ReturnType<typeof useVersionControlStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SettingsVersionControl,
		merge(
			{
				pinia,
				i18n,
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('SettingsSso', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		versionControlStore = useVersionControlStore(pinia);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render paywall state when there is no license', () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(queryByTestId('version-control-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('version-control-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		vi.spyOn(versionControlStore, 'isEnterpriseVersionControlEnabled', 'get').mockReturnValue(true);

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('version-control-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('version-control-content-unlicensed')).not.toBeInTheDocument();
	});
});
