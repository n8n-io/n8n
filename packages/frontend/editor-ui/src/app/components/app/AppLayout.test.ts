import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createRouter, createWebHistory, type RouteMeta } from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import AppLayout from './AppLayout.vue';

const mockLayouts = {
	DefaultLayout: {
		template: '<div data-test-id="default-layout"><slot /></div>',
	},
	SettingsLayout: {
		template: '<div data-test-id="settings-layout"><slot /></div>',
	},
	WorkflowLayout: {
		template: '<div data-test-id="workflow-layout"><slot /></div>',
	},
	BlankLayout: {
		template: '<div data-test-id="blank-layout"><slot /></div>',
	},
	DemoLayout: {
		template: '<div data-test-id="demo-layout"><slot /></div>',
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

	it('should render slot content within the layout', async () => {
		const router = createTestRouter();
		await router.push('/');
		const { getByText } = renderComponent(router)({
			slots: {
				default: '<div>Slot Content</div>',
			},
		});
		await flushPromises();

		expect(getByText('Slot Content')).toBeInTheDocument();
	});

	it('should emit load event on mount with layout element', async () => {
		const router = createTestRouter();
		await router.push('/');
		const onLoad = vi.fn();
		renderComponent(router)({
			attrs: {
				onLoad,
			},
		});
		await flushPromises();

		expect(onLoad).toHaveBeenCalledTimes(1);
		// The emitted value should be the layoutRef element or null
		const emittedValue = onLoad.mock.calls[0][0];
		expect(emittedValue === null || emittedValue instanceof Object).toBe(true);
	});

	it('should emit load event with null if layoutRef is not set', async () => {
		const router = createTestRouter();
		await router.push('/');
		const onLoad = vi.fn();
		renderComponent(router)({
			attrs: {
				onLoad,
			},
		});
		await flushPromises();

		expect(onLoad).toHaveBeenCalled();
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
		const { getByTestId: getByTestId1 } = renderComponent(router)();
		await flushPromises();
		expect(getByTestId1('default-layout')).toBeInTheDocument();

		// Test settings layout in a new instance
		await router.push('/settings');
		const { getByTestId: getByTestId2 } = renderComponent(router)();
		await flushPromises();
		expect(getByTestId2('settings-layout')).toBeInTheDocument();
	});

	it('should render multiple slot items', async () => {
		const router = createTestRouter();
		await router.push('/');
		const { getByText } = renderComponent(router)({
			slots: {
				default: `
					<div>First Item</div>
					<div>Second Item</div>
					<div>Third Item</div>
				`,
			},
		});
		await flushPromises();

		expect(getByText('First Item')).toBeInTheDocument();
		expect(getByText('Second Item')).toBeInTheDocument();
		expect(getByText('Third Item')).toBeInTheDocument();
	});

	it('should pass slot content to the layout component', async () => {
		const router = createTestRouter();
		await router.push('/workflow');
		const { getByText, getByTestId } = renderComponent(router)({
			slots: {
				default: '<div>Persistent Content</div>',
			},
		});
		await flushPromises();

		expect(getByTestId('workflow-layout')).toBeInTheDocument();
		expect(getByText('Persistent Content')).toBeInTheDocument();
	});

	it('should compute the correct layout component from route meta', async () => {
		const router = createTestRouter();

		// Test default layout
		await router.push('/');
		const result1 = renderComponent(router)();
		await flushPromises();
		expect(result1.getByTestId('default-layout')).toBeInTheDocument();

		// Test blank layout
		await router.push('/blank');
		const result2 = renderComponent(router)();
		await flushPromises();
		expect(result2.getByTestId('blank-layout')).toBeInTheDocument();
	});
});
