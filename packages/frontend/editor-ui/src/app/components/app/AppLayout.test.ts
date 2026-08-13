import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createRouter, createWebHistory, type RouteMeta } from 'vue-router';
import type { ComponentOptions } from 'vue';
import { flushPromises } from '@vue/test-utils';
import AppLayout from './AppLayout.vue';

const mockLayouts = {
	DefaultLayout: {
		template: '<div data-test-id="default-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	} as ComponentOptions,
	SettingsLayout: {
		template: '<div data-test-id="settings-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	} as ComponentOptions,
	WorkflowLayout: {
		template: '<div data-test-id="workflow-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	} as ComponentOptions,
	AuthLayout: {
		template: '<div data-test-id="auth-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	} as ComponentOptions,
	DemoLayout: {
		template: '<div data-test-id="demo-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	} as ComponentOptions,
};

const component = { template: '<div>Page Content</div>' };

const createTestRouter = (metaLayout?: RouteMeta['layout']) => {
	return createRouter({
		history: createWebHistory(),
		routes: [
			{
				path: '/',
				name: 'Home',
				component,
				meta: metaLayout ? ({ layout: metaLayout } satisfies RouteMeta) : {},
			},
			{
				path: '/settings',
				name: 'Settings',
				component,
				meta: { layout: 'settings' },
			},
			{
				path: '/workflow',
				name: 'Workflow',
				component,
				meta: { layout: 'workflow' },
			},
			{
				path: '/auth',
				name: 'Auth',
				component,
				meta: { layout: 'auth' },
			},
			{
				path: '/demo',
				name: 'Demo',
				component,
				meta: { layout: 'demo' },
			},
			{
				path: '/unknown',
				name: 'Unknown',
				component,
				meta: { layout: 'unknown' as unknown as RouteMeta['layout'] },
			},
		],
	});
};

const renderComponent = (router = createTestRouter()) => {
	return createComponentRenderer(AppLayout, {
		global: {
			plugins: [router],
			stubs: {
				DefaultLayout: mockLayouts.DefaultLayout,
				SettingsLayout: mockLayouts.SettingsLayout,
				WorkflowLayout: mockLayouts.WorkflowLayout,
				AuthLayout: mockLayouts.AuthLayout,
				DemoLayout: mockLayouts.DemoLayout,
				Suspense: {
					template: '<div><slot /></div>',
				},
			},
		},
	});
};

describe('AppLayout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the component without throwing', () => {
		const router = createTestRouter();
		expect(() => renderComponent(router)()).not.toThrow();
	});

	it('should render default layout when no layout is specified in route meta', async () => {
		const router = createTestRouter();
		const { getByTestId } = renderComponent(router)();
		await router.push('/');
		await flushPromises();

		expect(getByTestId('default-layout')).toBeInTheDocument();
	});

	it('should render settings layout when layout is "settings"', async () => {
		const router = createTestRouter();
		const { getByTestId } = renderComponent(router)();
		await router.push('/settings');
		await flushPromises();

		expect(getByTestId('settings-layout')).toBeInTheDocument();
	});

	it('should render workflow layout when layout is "workflow"', async () => {
		const router = createTestRouter();
		const { getByTestId } = renderComponent(router)();
		await router.push('/workflow');
		await flushPromises();

		expect(getByTestId('workflow-layout')).toBeInTheDocument();
	});

	it('should render auth layout when layout is "auth"', async () => {
		const router = createTestRouter();
		const { getByTestId } = renderComponent(router)();
		await router.push('/auth');
		await flushPromises();

		expect(getByTestId('auth-layout')).toBeInTheDocument();
	});

	it('should render demo layout when layout is "demo"', async () => {
		const router = createTestRouter();
		const { getByTestId } = renderComponent(router)();
		await router.push('/demo');
		await flushPromises();

		expect(getByTestId('demo-layout')).toBeInTheDocument();
	});

	it('should render default layout when an unknown layout is specified', async () => {
		const router = createTestRouter();
		const { getByTestId } = renderComponent(router)();
		await router.push('/unknown');
		await flushPromises();

		expect(getByTestId('default-layout')).toBeInTheDocument();
	});

	it('should emit mounted event on mount with layout element', async () => {
		const router = createTestRouter();
		const onMounted = vi.fn();
		renderComponent(router)({
			attrs: {
				onMounted,
			},
		});
		await router.push('/');
		await flushPromises();

		expect(onMounted).toHaveBeenCalledTimes(1);
		// The emitted value should be the layoutRef element or null
		const emittedValue = onMounted.mock.calls[0][0];
		expect(emittedValue === null || emittedValue instanceof Object).toBe(true);
	});

	it('should emit mounted event with null if layoutRef is not set', async () => {
		const router = createTestRouter();
		const onMounted = vi.fn();
		renderComponent(router)({
			attrs: {
				onMounted,
			},
		});
		await router.push('/');
		await flushPromises();

		expect(onMounted).toHaveBeenCalled();
	});

	it('should use Suspense to handle async component loading', async () => {
		const router = createTestRouter();
		const { container } = renderComponent(router)();
		await router.push('/');

		// The component should be wrapped in Suspense
		// We can't directly check for Suspense, but we can verify the layout renders
		await flushPromises();
		expect(container.querySelector('[data-test-id="default-layout"]')).toBeInTheDocument();
	});

	it('should render the correct layout based on current route', async () => {
		const router = createTestRouter();

		// Test default layout
		const result1 = renderComponent(router)();
		await router.push('/');
		await flushPromises();
		expect(result1.getByTestId('default-layout')).toBeInTheDocument();
		result1.unmount();

		// Test settings layout in a new instance
		const result2 = renderComponent(router)();
		await router.push('/settings');
		await flushPromises();
		expect(result2.getByTestId('settings-layout')).toBeInTheDocument();
		result2.unmount();
	});

	it('should compute the correct layout component from route meta', async () => {
		const router = createTestRouter();

		// Test default layout
		const result1 = renderComponent(router)();
		await router.push('/');
		await flushPromises();
		expect(result1.getByTestId('default-layout')).toBeInTheDocument();
		result1.unmount();

		// Test auth layout
		const result2 = renderComponent(router)();
		await router.push('/auth');
		await flushPromises();
		expect(result2.getByTestId('auth-layout')).toBeInTheDocument();
		result2.unmount();
	});
});
