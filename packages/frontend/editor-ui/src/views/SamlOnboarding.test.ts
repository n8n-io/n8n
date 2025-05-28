import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import SamlOnboarding from '@/views/SamlOnboarding.vue';
import { useSSOStore } from '@/stores/sso.store';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';

vi.mock('vue-router', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
		}),
		RouterLink: vi.fn(),
		useRoute: vi.fn(),
	};
});

let pinia: ReturnType<typeof createTestingPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;
let router: ReturnType<typeof useRouter>;

const renderComponent = createComponentRenderer(SamlOnboarding);

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

		const { getByRole, getAllByRole } = renderComponent({ pinia });

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
