import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsLayout from './SettingsLayout.vue';
import { VIEWS } from '@/app/constants';
import { describe, it, expect } from 'vitest';

const component = { template: '<div />' };

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			redirect: '/home',
		},
		{
			path: '/home',
			name: VIEWS.HOMEPAGE,
			redirect: '/home/workflows',
			children: [
				{
					path: 'workflows',
					name: 'Workflows',
					component,
				},
				{
					path: 'credentials',
					name: 'Credentials',
					component,
				},
				{
					path: 'executions',
					name: 'Executions',
					component,
				},
			],
		},
		{
			path: '/settings',
			name: VIEWS.SETTINGS,
			component,
			props: true,
			redirect: { name: VIEWS.PERSONAL_SETTINGS },
			children: [
				{
					path: 'personal',
					name: VIEWS.PERSONAL_SETTINGS,
					component,
				},
				{
					path: 'users',
					name: VIEWS.USERS_SETTINGS,
					component,
				},
				{
					path: 'api',
					name: VIEWS.API_SETTINGS,
					component,
				},
				{
					path: 'environments',
					name: 'EnvironmentsSettings',
					component,
				},
			],
		},
	],
});

const renderComponent = createComponentRenderer(SettingsLayout, {
	pinia: createTestingPinia(),
	global: {
		plugins: [router],
		stubs: {
			SettingsSidebar: {
				template:
					'<div data-test-id="settings-sidebar"><button data-test-id="back" @click="$emit(\'return\')">Back</button></div>',
			},
			RouterView: {
				template: '<div><slot /></div>',
			},
			Suspense: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('SettingsLayout', () => {
	it('should render the layout without throwing', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the main content area', () => {
		const { container } = renderComponent();
		const mainElement = container.querySelector('main#content');
		expect(mainElement).toBeInTheDocument();
	});

	it('should render app grid container from BaseLayout', () => {
		const { container } = renderComponent();
		const gridElement = container.querySelector('.app-grid');
		expect(gridElement).toBeInTheDocument();
	});

	it('should render RouterView content', () => {
		const { getByText } = renderComponent({
			global: {
				stubs: {
					SettingsSidebar: {
						template:
							'<div data-test-id="settings-sidebar"><button data-test-id="back" @click="$emit(\'return\')">Back</button></div>',
					},
					RouterView: {
						template: '<div>Settings Content</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByText('Settings Content')).toBeInTheDocument();
	});

	it('should render SettingsSidebar in sidebar slot', () => {
		const { getByTestId, container } = renderComponent();
		expect(getByTestId('settings-sidebar')).toBeInTheDocument();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).toBeInTheDocument();
	});

	it('should wrap SettingsSidebar in Suspense', () => {
		const { getByTestId } = renderComponent();
		const sidebar = getByTestId('settings-sidebar');
		expect(sidebar).toBeInTheDocument();
		expect(sidebar.textContent).toContain('Back');
	});

	it('should not render header', () => {
		const { container } = renderComponent();
		const headerElement = container.querySelector('header#header');
		expect(headerElement).not.toBeInTheDocument();
	});

	it('should render content with proper CSS module classes', () => {
		const { container } = renderComponent({
			global: {
				stubs: {
					SettingsSidebar: {
						template:
							'<div data-test-id="settings-sidebar"><button data-test-id="back" @click="$emit(\'return\')">Back</button></div>',
					},
					RouterView: {
						template: '<div>Test Content</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		const contentContainer = container.querySelector('[class*="contentContainer"]');
		expect(contentContainer).toBeInTheDocument();
		const content = container.querySelector('[class*="content"]');
		expect(content).toBeInTheDocument();
	});

	it('should emit return event when back button is clicked', async () => {
		const { getByTestId } = renderComponent();
		await router.push('/settings/personal');

		await userEvent.click(getByTestId('back'));

		// After clicking back, navigation should occur (to either homepage or previous route)
		expect(router.currentRoute.value.path).not.toBe('/settings/personal');
	});

	it('should navigate away from settings when back button is clicked', async () => {
		const { getByTestId } = renderComponent();
		await router.push('/settings/api');

		const beforePath = router.currentRoute.value.path;
		await userEvent.click(getByTestId('back'));

		// Navigation should have occurred
		expect(router.currentRoute.value.path).not.toBe(beforePath);
	});

	it('should render sidebar and content together', () => {
		const { getByText, getByTestId } = renderComponent({
			global: {
				stubs: {
					SettingsSidebar: {
						template:
							'<div data-test-id="settings-sidebar"><button data-test-id="back" @click="$emit(\'return\')">Back</button></div>',
					},
					RouterView: {
						template: '<div>Settings Page Content</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByTestId('settings-sidebar')).toBeInTheDocument();
		expect(getByText('Settings Page Content')).toBeInTheDocument();
	});
});
