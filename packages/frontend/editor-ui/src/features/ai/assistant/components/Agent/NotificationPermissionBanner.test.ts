import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import NotificationPermissionBanner from './NotificationPermissionBanner.vue';
import { createTestingPinia } from '@pinia/testing';

// Mock useBrowserNotifications
const mockRequestPermission = vi
	.fn()
	.mockResolvedValue({ permission: 'granted', wasRequested: true });
const mockRecordDismissal = vi.fn();

vi.mock('@/app/composables/useBrowserNotifications', () => ({
	useBrowserNotifications: () => ({
		requestPermission: mockRequestPermission,
		recordDismissal: mockRecordDismissal,
	}),
}));

// Mock i18n
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('NotificationPermissionBanner', () => {
	beforeEach(() => {
		mockRequestPermission.mockClear();
		mockRecordDismissal.mockClear();
	});

	const mountComponent = () => {
		return mount(NotificationPermissionBanner, {
			global: {
				plugins: [createTestingPinia()],
				stubs: {
					N8nIcon: {
						template: '<span class="n8n-icon" :data-icon="icon" @click="$emit(\'click\')"></span>',
						props: ['icon', 'size'],
					},
					N8nButton: {
						template: '<button class="n8n-button" @click="$emit(\'click\')"><slot /></button>',
						props: ['type', 'size'],
					},
				},
			},
		});
	};

	it('renders the banner with correct elements', () => {
		const wrapper = mountComponent();

		expect(wrapper.find('[data-test-id="notification-permission-banner"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('aiAssistant.builder.notificationBanner.text');
		expect(wrapper.text()).toContain('aiAssistant.builder.notificationBanner.notify');
	});

	it('renders bell icon', () => {
		const wrapper = mountComponent();

		const bellIcon = wrapper.find('[data-icon="bell"]');
		expect(bellIcon.exists()).toBe(true);
	});

	it('renders close icon', () => {
		const wrapper = mountComponent();

		const closeIcon = wrapper.find('[data-test-id="notification-banner-dismiss"]');
		expect(closeIcon.exists()).toBe(true);
	});

	it('renders notify button', () => {
		const wrapper = mountComponent();

		const notifyButton = wrapper.find('[data-test-id="notification-banner-notify"]');
		expect(notifyButton.exists()).toBe(true);
	});

	describe('interactions', () => {
		it('calls requestPermission when notify button is clicked', async () => {
			const wrapper = mountComponent();

			const notifyButton = wrapper.find('[data-test-id="notification-banner-notify"]');
			await notifyButton.trigger('click');

			expect(mockRequestPermission).toHaveBeenCalled();
		});

		it('calls recordDismissal when close icon is clicked', async () => {
			const wrapper = mountComponent();

			const closeIcon = wrapper.find('[data-test-id="notification-banner-dismiss"]');
			await closeIcon.trigger('click');

			expect(mockRecordDismissal).toHaveBeenCalled();
		});

		it('does not call recordDismissal when notify button is clicked', async () => {
			const wrapper = mountComponent();

			const notifyButton = wrapper.find('[data-test-id="notification-banner-notify"]');
			await notifyButton.trigger('click');

			expect(mockRecordDismissal).not.toHaveBeenCalled();
		});

		it('does not call requestPermission when close icon is clicked', async () => {
			const wrapper = mountComponent();

			const closeIcon = wrapper.find('[data-test-id="notification-banner-dismiss"]');
			await closeIcon.trigger('click');

			expect(mockRequestPermission).not.toHaveBeenCalled();
		});
	});
});
