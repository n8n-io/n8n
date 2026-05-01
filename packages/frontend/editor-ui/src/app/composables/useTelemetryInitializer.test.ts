import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { mock } from 'vitest-mock-extended';
import { useTelemetryInitializer } from './useTelemetryInitializer';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { Project } from '@/features/collaboration/projects/projects.types';

const mockRouteMeta: Record<string, unknown> = {};

vi.mock('vue-router', () => ({
	useRouter: vi.fn(),
	useRoute: () => ({
		meta: mockRouteMeta,
	}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@/app/composables/useTelemetry', () => {
	const init = vi.fn();
	return {
		useTelemetry: () => ({
			init,
		}),
	};
});

const TestComponent = defineComponent({
	setup() {
		useTelemetryInitializer();
		return () => h('div');
	},
});

describe('useTelemetryInitializer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear route meta
		Object.keys(mockRouteMeta).forEach((key) => delete mockRouteMeta[key]);
	});

	it('should not throw error when called', () => {
		expect(() =>
			mount(TestComponent, { global: { plugins: [createTestingPinia()] } }),
		).not.toThrow();
	});

	it('should initialize if telemetry is enabled in settings and not disabled on the route', async () => {
		const pinia = createTestingPinia({
			stubActions: false,
			initialState: {
				users: {
					currentUserId: '123',
				},
				projects: {
					personalProject: mock<Project>({ id: '789' }),
				},
				settings: {
					settings: {
						telemetry: {
							enabled: true,
						},
					},
				},
			},
		});

		const telemetryPlugin = useTelemetry();
		const wrapper = mount(TestComponent, { global: { plugins: [pinia] } });

		await nextTick();

		expect(telemetryPlugin.init).toHaveBeenCalledWith(
			{
				enabled: true,
			},
			expect.objectContaining({
				userId: '123',
				projectId: '789',
			}),
		);

		wrapper.unmount();
	});

	it('should not initialize if telemetry is disabled in settings', async () => {
		const pinia = createTestingPinia({
			stubActions: false,
			initialState: {
				settings: {
					settings: {
						telemetry: {
							enabled: false,
						},
					},
				},
			},
		});

		const telemetryPlugin = useTelemetry();
		const wrapper = mount(TestComponent, { global: { plugins: [pinia] } });

		await nextTick();

		expect(telemetryPlugin.init).not.toHaveBeenCalled();

		wrapper.unmount();
	});

	it('should not initialize if telemetry is disabled on the route', async () => {
		// Set route meta before mounting
		mockRouteMeta.telemetry = {
			disabled: true,
		};

		const pinia = createTestingPinia({
			stubActions: false,
			initialState: {
				settings: {
					settings: {
						telemetry: {
							enabled: true,
						},
					},
				},
			},
		});

		const telemetryPlugin = useTelemetry();
		const wrapper = mount(TestComponent, { global: { plugins: [pinia] } });

		await nextTick();

		expect(telemetryPlugin.init).not.toHaveBeenCalled();

		wrapper.unmount();
	});
});
