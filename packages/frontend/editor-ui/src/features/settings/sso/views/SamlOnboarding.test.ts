import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import SamlOnboarding from './SamlOnboarding.vue';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

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

	describe('after the name is saved', () => {
		async function submitName() {
			const rendered = renderComponent({ pinia });
			const [firstName, lastName] = rendered.getAllByRole('textbox');
			await userEvent.type(firstName, 'Jane');
			await userEvent.type(lastName, 'Doe');
			await userEvent.click(rendered.getByRole('button'));
			await waitAllPromises();
			return rendered;
		}

		function setExperienceModes(enabled: boolean) {
			useSettingsStore(pinia).moduleSettings = {
				'instance-ai': { enabled: true, experience: { enabled, defaultMode: 'simple' } },
			} as ReturnType<typeof useSettingsStore>['moduleSettings'];
		}

		beforeEach(() => {
			vi.spyOn(usersStore, 'updateUserName').mockResolvedValue({ id: '1', isPending: false });
		});

		it('opens the overview while experience modes are off', async () => {
			setExperienceModes(false);

			await submitName();

			expect(usersStore.updateUserName).toHaveBeenCalledWith({ firstName: 'Jane', lastName: 'Doe' });
			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('opens the app root, which leads to the Assistant, while experience modes are on', async () => {
			setExperienceModes(true);

			await submitName();

			expect(router.push).toHaveBeenCalledTimes(1);
			expect(router.push).toHaveBeenCalledWith('/');
		});

		it('stays on the form when the name cannot be saved', async () => {
			setExperienceModes(true);
			vi.mocked(usersStore.updateUserName).mockRejectedValueOnce(new Error('offline'));

			const { getAllByRole } = await submitName();

			expect(router.push).not.toHaveBeenCalled();
			expect(getAllByRole('textbox')[0]).toHaveValue('Jane');
		});
	});
});
