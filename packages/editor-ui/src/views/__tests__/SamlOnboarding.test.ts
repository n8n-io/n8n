import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router/composables';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import SamlOnboarding from '@/views/SamlOnboarding.vue';
import { useSSOStore } from '@/stores/sso';
import { STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { i18nInstance } from '@/plugins/i18n';

vi.mock('vue-router/composables', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
		}),
	};
});

let pinia: ReturnType<typeof createTestingPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;
let router: ReturnType<typeof useRouter>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SamlOnboarding,
		merge(
			{
				pinia,
				i18n: i18nInstance,
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('SamlOnboarding', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		ssoStore = useSSOStore(pinia);
		router = useRouter();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should submit filled in form only and redirect', async () => {
		vi.spyOn(ssoStore, 'updateUser').mockResolvedValue({
			id: '1',
			isPending: false,
		});

		const { getByRole, getAllByRole } = renderComponent();

		const inputs = getAllByRole('textbox');
		const submit = getByRole('button');

		await userEvent.click(submit);
		await waitAllPromises();

		expect(ssoStore.updateUser).not.toHaveBeenCalled();
		expect(router.push).not.toHaveBeenCalled();

		await userEvent.type(inputs[0], 'test');
		await userEvent.type(inputs[1], 'test');
		await userEvent.click(submit);

		expect(ssoStore.updateUser).toHaveBeenCalled();
		expect(router.push).toHaveBeenCalled();
	});
});
