import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ForgotMyPasswordView from '../ForgotMyPasswordView.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useLocale } from '@/composables/useLocale';

vi.mock('@/composables/useToast');
vi.mock('@/composables/useMessage');
vi.mock('@/composables/useLocale');

describe('ForgotMyPasswordView', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('should show reset n8n button when admin is not set up', async () => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			userManagement: {
				showSetupOnFirstLoad: true,
			},
		};

		const wrapper = mount(ForgotMyPasswordView);
		await wrapper.vm.$nextTick();

		expect(wrapper.find('[data-test-id="reset-n8n-button"]').exists()).toBe(true);
	});

	it('should not show reset n8n button when admin is set up', async () => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			userManagement: {
				showSetupOnFirstLoad: false,
			},
		};

		const wrapper = mount(ForgotMyPasswordView);
		await wrapper.vm.$nextTick();

		expect(wrapper.find('[data-test-id="reset-n8n-button"]').exists()).toBe(false);
	});

	it('should show confirmation dialog when reset button is clicked', async () => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			userManagement: {
				showSetupOnFirstLoad: true,
			},
		};

		const wrapper = mount(ForgotMyPasswordView);
		await wrapper.vm.$nextTick();

		await wrapper.find('[data-test-id="reset-n8n-button"]').trigger('click');
		await wrapper.vm.$nextTick();

		expect(wrapper.find('[data-test-id="reset-n8n-confirm-dialog"]').exists()).toBe(true);
	});

	it('should call reset API when confirmed', async () => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			userManagement: {
				showSetupOnFirstLoad: true,
			},
		};

		const mockToast = {
			showError: vi.fn(),
			showSuccess: vi.fn(),
		};
		vi.mocked(useToast).mockReturnValue(mockToast);

		const wrapper = mount(ForgotMyPasswordView);
		await wrapper.vm.$nextTick();

		// Click reset button
		await wrapper.find('[data-test-id="reset-n8n-button"]').trigger('click');
		await wrapper.vm.$nextTick();

		// Mock successful API response
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});

		// Click confirm
		await wrapper.find('[data-test-id="reset-n8n-confirm"]').trigger('click');
		await wrapper.vm.$nextTick();

		expect(global.fetch).toHaveBeenCalledWith('/rest/reset-n8n', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		expect(mockToast.showSuccess).toHaveBeenCalled();
	});

	it('should show error toast when reset API fails', async () => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			userManagement: {
				showSetupOnFirstLoad: true,
			},
		};

		const mockToast = {
			showError: vi.fn(),
			showSuccess: vi.fn(),
		};
		vi.mocked(useToast).mockReturnValue(mockToast);

		const wrapper = mount(ForgotMyPasswordView);
		await wrapper.vm.$nextTick();

		// Click reset button
		await wrapper.find('[data-test-id="reset-n8n-button"]').trigger('click');
		await wrapper.vm.$nextTick();

		// Mock failed API response
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ message: 'Reset failed' }),
		});

		// Click confirm
		await wrapper.find('[data-test-id="reset-n8n-confirm"]').trigger('click');
		await wrapper.vm.$nextTick();

		expect(mockToast.showError).toHaveBeenCalled();
	});
});
