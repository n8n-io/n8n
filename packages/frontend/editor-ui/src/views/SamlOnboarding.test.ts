import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import SamlOnboarding from '@/views/SamlOnboarding.vue';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useUsersStore } from '@/stores/users.store';

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
let usersStore: ReturnType<typeof useUsersStore>;
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
		usersStore = useUsersStore(pinia);
		router = useRouter();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should submit filled in form only and redirect', async () => {
		vi.spyOn(usersStore, 'updateUserName').mockResolvedValue({
			id: '1',
			isPending: false,
		});

		const { getByRole, getAllByRole } = renderComponent({ pinia });

		const inputs = getAllByRole('textbox');
		const submit = getByRole('button');

		await userEvent.click(submit);
		await waitAllPromises();

		expect(usersStore.updateUserName).not.toHaveBeenCalled();
		expect(router.push).not.toHaveBeenCalled();

		await userEvent.type(inputs[0], 'test');
		await userEvent.type(inputs[1], 'test');
		await userEvent.click(submit);

		expect(usersStore.updateUserName).toHaveBeenCalled();
		expect(router.push).toHaveBeenCalled();
	});
});
