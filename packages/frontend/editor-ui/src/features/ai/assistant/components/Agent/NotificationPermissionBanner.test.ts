import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import NotificationPermissionBanner from './NotificationPermissionBanner.vue';
import { createTestingPinia } from '@pinia/testing';

// Mock useBrowserNotifications
const mockRequestPermission = vi.fn();
const mockRecordDismissal = vi.fn();
const mockResetMetadata = vi.fn();

vi.mock('@/app/composables/useBrowserNotifications', () => ({
	useBrowserNotifications: () => ({
		requestPermission: mockRequestPermission,
		recordDismissal: mockRecordDismissal,
		resetMetadata: mockResetMetadata,
	}),
}));

// Mock i18n
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
	i18n: {
		baseText: (key: string) => key,
	},
}));

// Mock builder store
const mockTrackWorkflowBuilderJourney = vi.fn();

vi.mock('../../builder.store', () => ({
	useBuilderStore: () => ({
		trackWorkflowBuilderJourney: mockTrackWorkflowBuilderJourney,
	}),
}));

describe('NotificationPermissionBanner', () => {
	beforeEach(() => {
		mockRequestPermission.mockReset();
		mockRequestPermission.mockResolvedValue({ permission: 'granted', wasRequested: true });
		mockRecordDismissal.mockClear();
		mockResetMetadata.mockClear();
		mockTrackWorkflowBuilderJourney.mockClear();
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

		it('tracks browser_notification_accept when notify button is clicked', async () => {
			const wrapper = mountComponent();

			const notifyButton = wrapper.find('[data-test-id="notification-banner-notify"]');
			await notifyButton.trigger('click');

			expect(mockTrackWorkflowBuilderJourney).toHaveBeenCalledWith('browser_notification_accept');
		});

		it('tracks browser_notification_dismiss when close icon is clicked', async () => {
			const wrapper = mountComponent();

			const closeIcon = wrapper.find('[data-test-id="notification-banner-dismiss"]');
			await closeIcon.trigger('click');

			expect(mockTrackWorkflowBuilderJourney).toHaveBeenCalledWith('browser_notification_dismiss');
		});

		it('calls resetMetadata when permission is granted', async () => {
			mockRequestPermission.mockResolvedValueOnce({ permission: 'granted', wasRequested: true });
			const wrapper = mountComponent();

			const notifyButton = wrapper.find('[data-test-id="notification-banner-notify"]');
			await notifyButton.trigger('click');
			await flushPromises();

			expect(mockResetMetadata).toHaveBeenCalled();
		});

		it('calls resetMetadata when permission is denied', async () => {
			mockRequestPermission.mockResolvedValueOnce({ permission: 'denied', wasRequested: true });
			const wrapper = mountComponent();

			const notifyButton = wrapper.find('[data-test-id="notification-banner-notify"]');
			await notifyButton.trigger('click');
			await flushPromises();

			expect(mockResetMetadata).toHaveBeenCalled();
		});

		it('does not call resetMetadata when permission is default', async () => {
			mockRequestPermission.mockResolvedValue({ permission: 'default', wasRequested: false });
			const wrapper = mountComponent();

			const notifyButton = wrapper.find('[data-test-id="notification-banner-notify"]');
			await notifyButton.trigger('click');
			await flushPromises();

			expect(mockResetMetadata).not.toHaveBeenCalled();
		});
	});
});
