import { createTestingPinia } from '@pinia/testing';

import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { PROMOTIONS_SETTINGS_VIEW } from '@/features/integrations/promotions.ee/promotions.constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

import { useEnvironmentsVersionSwitch } from './useEnvironmentsVersionSwitch';

const mockShowError = vi.fn();
const mockConfirm = vi.fn();
const mockPush = vi.fn();
const mockHasPermission = vi.fn(() => true);

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: () => mockHasPermission(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: vi.fn() }),
}));

vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('vue-router', async () => ({
	...(await vi.importActual<object>('vue-router')),
	useRouter: () => ({ push: mockPush }),
}));

describe('useEnvironmentsVersionSwitch', () => {
	let sourceControlStore: MockedStore<typeof useSourceControlStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		sourceControlStore = mockedStore(useSourceControlStore);
		mockConfirm.mockResolvedValue(MODAL_CONFIRM);
	});

	it.each([
		['v2', PROMOTIONS_SETTINGS_VIEW],
		['v1', VIEWS.SOURCE_CONTROL],
	] as const)(
		'saves only the version and opens the %s settings page after confirmation',
		async (version, route) => {
			await useEnvironmentsVersionSwitch().switchTo(version);

			expect(sourceControlStore.updatePreferences).toHaveBeenCalledWith({
				environmentsVersion: version,
			});
			expect(mockPush).toHaveBeenCalledWith({ name: route });
		},
	);

	it.each([
		[true, true, true],
		[false, true, false],
		[true, false, false],
	])(
		'offers the switch back only to an admin while v1 is connected (connected: %s, manage: %s)',
		(connected, canManage, canSwitchBack) => {
			sourceControlStore.preferences.connected = connected;
			mockHasPermission.mockReturnValue(canManage);

			expect(useEnvironmentsVersionSwitch().canSwitchBack.value).toBe(canSwitchBack);
		},
	);

	it('ignores a second switch while the first one saves', async () => {
		const save = Promise.withResolvers<void>();
		sourceControlStore.updatePreferences.mockReturnValue(save.promise);
		const { busy, switchTo } = useEnvironmentsVersionSwitch();

		const first = switchTo('v2');
		await switchTo('v2');

		expect(busy.value).toBe(true);
		expect(mockConfirm).toHaveBeenCalledTimes(1);
		save.resolve();
		await first;
		expect(sourceControlStore.updatePreferences).toHaveBeenCalledTimes(1);
		expect(busy.value).toBe(false);
	});

	it('clears the busy flag and shows the error when the confirmation fails', async () => {
		mockConfirm.mockRejectedValue(new Error('closed'));
		const { busy, switchTo } = useEnvironmentsVersionSwitch();

		await switchTo('v2');

		expect(sourceControlStore.updatePreferences).not.toHaveBeenCalled();
		expect(mockShowError).toHaveBeenCalled();
		expect(busy.value).toBe(false);
	});

	it('changes nothing when the admin cancels', async () => {
		mockConfirm.mockResolvedValue('cancel');

		await useEnvironmentsVersionSwitch().switchTo('v2');

		expect(sourceControlStore.updatePreferences).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('shows the error and stays on the page when the save fails', async () => {
		sourceControlStore.updatePreferences.mockRejectedValue(new Error('offline'));

		await useEnvironmentsVersionSwitch().switchTo('v2');

		expect(mockShowError).toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});
});
