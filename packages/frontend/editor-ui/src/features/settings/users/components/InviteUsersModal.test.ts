import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import InviteUsersModal from './InviteUsersModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { INVITE_USER_MODAL_KEY } from '../users.constants';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { useUsersStore } from '../users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRolesStore } from '@/app/stores/roles.store';
import type { IInviteResponse } from '../users.types';

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

const mockToast = {
	showMessage: vi.fn(),
	showError: vi.fn(),
};
vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => mockToast),
}));

// Reuse the real useClipboard, but let each test control what copy() does.
const mockClipboard = { copy: vi.fn() };
vi.mock('@/app/composables/useClipboard', () => ({
	useClipboard: vi.fn(() => mockClipboard),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: vi.fn(() => ({ goToUpgrade: vi.fn() })),
}));

const inviteLink = 'https://example.com/signup?inviterId=1&inviteeId=3';

const initialState = {
	[STORES.UI]: {
		modalsById: {
			[INVITE_USER_MODAL_KEY]: { open: true },
		},
		modalStack: [INVITE_USER_MODAL_KEY],
	},
};

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

const renderModal = createComponentRenderer(InviteUsersModal);
let pinia: ReturnType<typeof createTestingPinia>;
let usersStore: MockedStore<typeof useUsersStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let rolesStore: MockedStore<typeof useRolesStore>;

class ClipboardItemStub {
	constructor(readonly data: Record<string, Blob>) {}
}

async function submitSingleUrlInvite() {
	const utils = renderModal({
		props: {
			modalName: INVITE_USER_MODAL_KEY,
			data: {},
		},
		global,
		pinia,
	});

	// The form is built in onMounted, so wait for the emails input to appear.
	await userEvent.type(await utils.findByRole('textbox'), 'invitee@example.com');
	await userEvent.click(utils.getByTestId('invite-users-button'));

	return utils;
}

describe('InviteUsersModal', () => {
	beforeEach(() => {
		vi.stubGlobal('ClipboardItem', ClipboardItemStub);
		Object.defineProperty(window.navigator, 'clipboard', {
			value: { write: vi.fn().mockResolvedValue(undefined) },
			configurable: true,
		});

		pinia = createTestingPinia({ initialState });

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isSmtpSetup = false;
		// @ts-expect-error getter overridden for the test
		settingsStore.isEnterpriseFeatureEnabled = {};
		settingsStore.isChatFeatureEnabled = false;

		rolesStore = mockedStore(useRolesStore);
		rolesStore.processedInstanceRoles = [];
		rolesStore.customInstanceRoles = [];

		usersStore = mockedStore(useUsersStore);
		usersStore.inviteUsers.mockResolvedValue([
			{
				user: { id: '3', email: 'invitee@example.com', emailSent: false },
				error: undefined,
			},
		] as unknown as IInviteResponse[]);
		usersStore.generateInviteLink.mockResolvedValue({ link: inviteLink });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		Reflect.deleteProperty(window.navigator, 'clipboard');
	});

	it('should fall back to ClipboardItem when the primary copy fails', async () => {
		mockClipboard.copy.mockRejectedValue(new DOMException('not allowed', 'NotAllowedError'));

		await submitSingleUrlInvite();

		const write = window.navigator.clipboard.write as ReturnType<typeof vi.fn>;
		await waitFor(() => expect(write).toHaveBeenCalledTimes(1));

		const [items] = write.mock.calls[0] as [ClipboardItemStub[]];
		expect(items[0]).toBeInstanceOf(ClipboardItemStub);
		expect(items[0].data['text/plain']).toBeInstanceOf(Blob);
		expect(mockToast.showError).not.toHaveBeenCalled();
	});

	it('should not touch the fallback when the primary copy succeeds', async () => {
		mockClipboard.copy.mockResolvedValue(undefined);

		await submitSingleUrlInvite();

		await waitFor(() => expect(mockClipboard.copy).toHaveBeenCalledWith(inviteLink));
		expect(window.navigator.clipboard.write).not.toHaveBeenCalled();
		expect(mockToast.showError).not.toHaveBeenCalled();
	});

	it('should surface the error when both primary and fallback copy fail', async () => {
		const originalError = new DOMException('not allowed', 'NotAllowedError');
		mockClipboard.copy.mockRejectedValue(originalError);
		(window.navigator.clipboard.write as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('fallback failed'),
		);

		await submitSingleUrlInvite();

		await waitFor(() =>
			expect(mockToast.showError).toHaveBeenCalledWith(originalError, expect.any(String)),
		);
	});
});
