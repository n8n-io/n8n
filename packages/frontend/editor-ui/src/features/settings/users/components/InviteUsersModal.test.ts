import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ROLE } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { INVITE_USER_MODAL_KEY } from '../users.constants';
import type { IInviteResponse } from '../users.types';
import InviteUsersModal from './InviteUsersModal.vue';
import { useUsersStore } from '../users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRolesStore } from '@/app/stores/roles.store';

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const mockClipboard = {
	copy: vi.fn(),
};

const mockToast = {
	showMessage: vi.fn(),
	showError: vi.fn(),
};

vi.mock('@/app/composables/useClipboard', () => ({
	useClipboard: vi.fn(() => mockClipboard),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => mockToast),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: vi.fn(() => ({ goToUpgrade: vi.fn() })),
}));

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

function makeUrlInvite(id: string, email: string): IInviteResponse {
	return {
		user: {
			id,
			email,
			emailSent: false,
			inviteAcceptUrl: `https://example.com/signup?inviterId=owner&inviteeId=${id}`,
			role: ROLE.Member,
		},
	};
}

const renderModal = createComponentRenderer(InviteUsersModal);
let pinia: ReturnType<typeof createTestingPinia>;
let usersStore: MockedStore<typeof useUsersStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let rolesStore: MockedStore<typeof useRolesStore>;

describe('InviteUsersModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createTestingPinia();

		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
		rolesStore = mockedStore(useRolesStore);

		settingsStore.isSmtpSetup = false;
		settingsStore.isChatFeatureEnabled = false;
		settingsStore.isEnterpriseFeatureEnabled = {} as MockedStore<
			typeof useSettingsStore
		>['isEnterpriseFeatureEnabled'];
		rolesStore.processedInstanceRoles = [];
		rolesStore.customInstanceRoles = [];
	});

	it('copies a generated invite link via a deferred function on direct click', async () => {
		const link = 'https://example.com/signup?token=generated-token';
		usersStore.inviteUsers.mockResolvedValue([
			makeUrlInvite('3', 'a@example.com'),
			makeUrlInvite('4', 'b@example.com'),
		]);
		usersStore.generateInviteLink.mockResolvedValue({ link });

		const { findByTestId, getAllByTestId, getByRole } = renderModal({
			props: {
				modalName: INVITE_USER_MODAL_KEY,
				data: {},
			},
			global,
			pinia,
		});

		// Enter two emails (no SMTP → URL invites) and submit.
		const emailsInput = within(await findByTestId('emails')).getByRole('textbox');
		await userEvent.type(emailsInput, 'a@example.com, b@example.com');
		await userEvent.click(getByRole('button'));

		const generateButtons = await waitFor(() => getAllByTestId('generate-invite-link-button'));
		await userEvent.click(generateButtons[0]);

		expect(usersStore.generateInviteLink).toHaveBeenCalledWith({ id: '3' });
		await waitFor(async () => {
			expect(mockClipboard.copy).toHaveBeenCalledWith(expect.any(Function));
			const getLink = mockClipboard.copy.mock.calls.at(-1)![0];
			await expect(getLink()).resolves.toBe(link);
		});
	});
});
