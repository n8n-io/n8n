import { createPinia } from 'pinia';
import { waitAllPromises } from '@/__tests__/utils';
import SettingsPersonalView from '@/views/SettingsPersonalView.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { ROLE } from '@/constants';

let pinia: ReturnType<typeof createPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let server: ReturnType<typeof setupServer>;

const renderComponent = createComponentRenderer(SettingsPersonalView);

const currentUser = {
	id: '1',
	firstName: 'John',
	lastName: 'Doe',
	email: 'joh.doe@example.com',
	createdAt: Date().toString(),
	role: ROLE.Owner,
	isDefaultUser: false,
	isPendingUser: false,
	isPending: false,
	hasRecoveryCodesLeft: false,
	mfaEnabled: false,
};

describe('SettingsPersonalView', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();

		settingsStore = useSettingsStore(pinia);
		usersStore = useUsersStore(pinia);

		usersStore.users[currentUser.id] = currentUser;
		usersStore.currentUserId = currentUser.id;

		await settingsStore.getSettings();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should enable email and pw change', async () => {
		const { getByTestId, getAllByRole } = renderComponent({ pinia });
		await waitAllPromises();

		expect(getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email')).toBeEnabled();
		expect(getByTestId('change-password-link')).toBeInTheDocument();
	});

	describe('when external auth is enabled, email and password change', () => {
		beforeEach(() => {
			vi.spyOn(settingsStore, 'isSamlLoginEnabled', 'get').mockReturnValue(true);
			vi.spyOn(settingsStore, 'isDefaultAuthenticationSaml', 'get').mockReturnValue(true);
			vi.spyOn(settingsStore, 'isMfaFeatureEnabled', 'get').mockReturnValue(true);
		});

		it('should not be disabled for the instance owner', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(true);

			const { queryByTestId, getAllByRole } = renderComponent({ pinia });
			await waitAllPromises();

			expect(
				getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email'),
			).toBeEnabled();
			expect(queryByTestId('change-password-link')).toBeInTheDocument();
			expect(queryByTestId('mfa-section')).toBeInTheDocument();
		});

		it('should be disabled for members', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);

			const { queryByTestId, getAllByRole } = renderComponent({ pinia });
			await waitAllPromises();

			expect(
				getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email'),
			).toBeDisabled();
			expect(queryByTestId('change-password-link')).not.toBeInTheDocument();
			expect(queryByTestId('mfa-section')).not.toBeInTheDocument();
		});
	});
});
