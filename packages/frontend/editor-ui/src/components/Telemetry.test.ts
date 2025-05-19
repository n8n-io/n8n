import { useRoute } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import Telemetry from './Telemetry.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useTelemetry } from '@/composables/useTelemetry';

vi.mock('vue-router', () => {
	const meta = {};
	return {
		useRouter: vi.fn(),
		useRoute: () => ({
			meta,
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

vi.mock('@/composables/useTelemetry', () => {
	const init = vi.fn();
	return {
		useTelemetry: () => ({
			init,
		}),
	};
});

const renderComponent = createComponentRenderer(Telemetry, {
	pinia: createTestingPinia(),
});

let route: ReturnType<typeof useRoute>;
let rootStore: MockedStore<typeof useRootStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let usersStore: MockedStore<typeof useUsersStore>;
let telemetryPlugin: ReturnType<typeof useTelemetry>;

describe('Telemetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		route = useRoute();
		rootStore = mockedStore(useRootStore);
		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);
		telemetryPlugin = useTelemetry();
	});

	it('should not throw error when opened', async () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should initialize if telemetry is enabled in settings and not disabled on the route', async () => {
		settingsStore.telemetry = {
			enabled: true,
		};
		usersStore.currentUserId = '123';
		rootStore.instanceId = '456';
		renderComponent();

		expect(telemetryPlugin.init).toHaveBeenCalledWith(
			{
				enabled: true,
			},
			expect.objectContaining({
				userId: '123',
				instanceId: '456',
			}),
		);
	});

	it('should not initialize if telemetry is disabled in settings', async () => {
		settingsStore.telemetry = {
			enabled: false,
		};
		renderComponent();

		expect(telemetryPlugin.init).not.toHaveBeenCalled();
	});

	it('should not initialize if telemetry is disabled on the route', async () => {
		settingsStore.telemetry = {
			enabled: true,
		};
		route.meta.telemetry = {
			disabled: true,
		};
		renderComponent();

		expect(telemetryPlugin.init).not.toHaveBeenCalled();
	});

	it('should render the iframe with correct src', async () => {
		settingsStore.telemetry = {
			enabled: true,
		};
		usersStore.currentUserId = '123';
		rootStore.instanceId = '456';
		const { container } = renderComponent();

		const iframe = container.querySelector('iframe');

		expect(iframe).toBeInTheDocument();
		expect(iframe).not.toBeVisible();
		expect(iframe).toHaveAttribute('src', expect.stringContaining('userId=123'));
		expect(iframe).toHaveAttribute('src', expect.stringContaining('instanceId=456'));
	});

	it('should not render the iframe if telemetry disabled', async () => {
		settingsStore.telemetry = {
			enabled: false,
		};
		usersStore.currentUserId = '123';
		rootStore.instanceId = '456';
		const { container } = renderComponent();

		const iframe = container.querySelector('iframe');

		expect(iframe).not.toBeInTheDocument();
	});
});
