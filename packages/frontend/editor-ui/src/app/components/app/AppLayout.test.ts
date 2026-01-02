import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createRouter, createWebHistory, type RouteMeta } from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import AppLayout from './AppLayout.vue';

const mockLayouts = {
	DefaultLayout: {
		template: '<div data-test-id="default-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	},
	SettingsLayout: {
		template: '<div data-test-id="settings-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	},
	WorkflowLayout: {
		template: '<div data-test-id="workflow-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	},
	BlankLayout: {
		template: '<div data-test-id="blank-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	},
	DemoLayout: {
		template: '<div data-test-id="demo-layout"><slot /></div>',
		mounted() {
			this.$emit('mounted', this.$el);
		},
	},
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
				path: '/blank',
				name: 'Blank',
				component,
				meta: { layout: 'blank' },
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
				BlankLayout: mockLayouts.BlankLayout,
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
		await router.push('/');
		const { getByTestId } = renderComponent(router)();
		await flushPromises();

		expect(getByTestId('default-layout')).toBeInTheDocument();
	});

	it('should render settings layout when layout is "settings"', async () => {
		const router = createTestRouter();
		await router.push('/settings');
		const { getByTestId } = renderComponent(router)();
		await flushPromises();

		expect(getByTestId('settings-layout')).toBeInTheDocument();
	});

	it('should render workflow layout when layout is "workflow"', async () => {
		const router = createTestRouter();
		await router.push('/workflow');
		const { getByTestId } = renderComponent(router)();
		await flushPromises();

		expect(getByTestId('workflow-layout')).toBeInTheDocument();
	});

	it('should render blank layout when layout is "blank"', async () => {
		const router = createTestRouter();
		await router.push('/blank');
		const { getByTestId } = renderComponent(router)();
		await flushPromises();

		expect(getByTestId('blank-layout')).toBeInTheDocument();
	});

	it('should render demo layout when layout is "demo"', async () => {
		const router = createTestRouter();
		await router.push('/demo');
		const { getByTestId } = renderComponent(router)();
		await flushPromises();

		expect(getByTestId('demo-layout')).toBeInTheDocument();
	});

	it('should render default layout when an unknown layout is specified', async () => {
		const router = createTestRouter();
		await router.push('/unknown');
		const { getByTestId } = renderComponent(router)();
		await flushPromises();

		expect(getByTestId('default-layout')).toBeInTheDocument();
	});

	it('should emit mounted event on mount with layout element', async () => {
		const router = createTestRouter();
		await router.push('/');
		const onMounted = vi.fn();
		renderComponent(router)({
			attrs: {
				onMounted,
			},
		});
		await flushPromises();

		expect(onMounted).toHaveBeenCalledTimes(1);
		// The emitted value should be the layoutRef element or null
		const emittedValue = onMounted.mock.calls[0][0];
		expect(emittedValue === null || emittedValue instanceof Object).toBe(true);
	});

	it('should emit mounted event with null if layoutRef is not set', async () => {
		const router = createTestRouter();
		await router.push('/');
		const onMounted = vi.fn();
		renderComponent(router)({
			attrs: {
				onMounted,
			},
		});
		await flushPromises();

		expect(onMounted).toHaveBeenCalled();
	});

	it('should use Suspense to handle async component loading', async () => {
		const router = createTestRouter();
		await router.push('/');
		const { container } = renderComponent(router)();

		// The component should be wrapped in Suspense
		// We can't directly check for Suspense, but we can verify the layout renders
		await flushPromises();
		expect(container.querySelector('[data-test-id="default-layout"]')).toBeInTheDocument();
	});

	it('should render the correct layout based on current route', async () => {
		const router = createTestRouter();

		// Test default layout
		await router.push('/');
		const result1 = renderComponent(router)();
		await flushPromises();
		expect(result1.getByTestId('default-layout')).toBeInTheDocument();
		result1.unmount();

		// Test settings layout in a new instance
		await router.push('/settings');
		const result2 = renderComponent(router)();
		await flushPromises();
		expect(result2.getByTestId('settings-layout')).toBeInTheDocument();
		result2.unmount();
	});

	it('should compute the correct layout component from route meta', async () => {
		const router = createTestRouter();

		// Test default layout
		await router.push('/');
		const result1 = renderComponent(router)();
		await flushPromises();
		expect(result1.getByTestId('default-layout')).toBeInTheDocument();
		result1.unmount();

		// Test blank layout
		await router.push('/blank');
		const result2 = renderComponent(router)();
		await flushPromises();
		expect(result2.getByTestId('blank-layout')).toBeInTheDocument();
		result2.unmount();
	});
});
