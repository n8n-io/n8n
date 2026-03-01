import userEvent from '@testing-library/user-event';
import { configure, render, waitFor } from '@testing-library/vue';
import { h } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import NavigationDropdown from './NavigationDropdown.vue';

configure({ testIdAttribute: 'data-test-id' });

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'home',
			redirect: '/home',
		},
		{
			path: '/projects',
			name: 'projects',
			component: { template: '<h1>projects</h1>' },
		},
	],
});

describe('N8nNavigationDropdown', () => {
	beforeAll(async () => {
		await router.push('/');

		await router.isReady();
	});

	it('default slot should trigger first level', async () => {
		const { getByTestId, queryByTestId } = render(NavigationDropdown, {
			slots: { default: h('button', { 'data-test-id': 'test-trigger' }) },
			props: { menu: [{ id: 'first', title: 'first', route: { name: 'projects' } }] },
			global: {
				plugins: [router],
			},
		});
		expect(getByTestId('test-trigger')).toBeVisible();
		expect(queryByTestId('navigation-menu-item')).not.toBeVisible();

		await userEvent.click(getByTestId('test-trigger'));
		await waitFor(() => expect(queryByTestId('navigation-menu-item')).toBeVisible());
	});

	it('redirect to route', async () => {
		const { getByTestId, queryByTestId } = render(NavigationDropdown, {
			slots: { default: h('button', { 'data-test-id': 'test-trigger' }) },
			props: {
				menu: [
					{
						id: 'first',
						title: 'first',
						submenu: [{ id: 'nested', title: 'nested', route: { name: 'projects' } }],
					},
				],
			},
			global: {
				plugins: [router],
			},
		});

		expect(getByTestId('test-trigger')).toBeVisible();
		expect(queryByTestId('navigation-submenu')).not.toBeVisible();

		await userEvent.click(getByTestId('test-trigger'));

		await waitFor(() => expect(getByTestId('navigation-submenu')).toBeVisible());

		await userEvent.click(getByTestId('navigation-submenu-item'));

		expect(router.currentRoute.value.name).toBe('projects');
	});

	it('should render icons in submenu when provided', () => {
		const { getByTestId } = render(NavigationDropdown, {
			slots: { default: h('button', { 'data-test-id': 'test-trigger' }) },
			props: {
				menu: [
					{
						id: 'first',
						title: 'first',
						submenu: [{ id: 'nested', title: 'nested', route: { name: 'projects' }, icon: 'user' }],
					},
				],
			},
			global: {
				plugins: [router],
			},
		});

		expect(getByTestId('navigation-submenu-item').querySelector('.submenu__icon')).toBeTruthy();
	});

	it('should propagate events', async () => {
		const { getByTestId, emitted } = render(NavigationDropdown, {
			slots: { default: h('button', { 'data-test-id': 'test-trigger' }) },
			props: {
				menu: [
					{
						id: 'first',
						title: 'first',
						submenu: [{ id: 'nested', title: 'nested', route: { name: 'projects' }, icon: 'user' }],
					},
				],
			},
			global: {
				plugins: [router],
			},
		});

		await userEvent.click(getByTestId('navigation-submenu-item'));

		expect(emitted('itemClick')).toStrictEqual([
			[{ active: true, index: 'nested', indexPath: ['-1', 'first', 'nested'] }],
		]);
		expect(emitted('select')).toStrictEqual([['nested']]);
	});

	it('should open first level on click', async () => {
		const { getByTestId, getByText } = render(NavigationDropdown, {
			slots: { default: h('button', { 'data-test-id': 'test-trigger' }) },
			props: {
				menu: [
					{
						id: 'first',
						title: 'first',
					},
				],
			},
		});
		expect(getByText('first')).not.toBeVisible();
		await userEvent.click(getByTestId('test-trigger'));
		expect(getByText('first')).toBeVisible();
	});

	it('should toggle nested level on mouseenter / mouseleave', async () => {
		const { getByTestId, getByText } = render(NavigationDropdown, {
			slots: { default: h('button', { 'data-test-id': 'test-trigger' }) },
			props: {
				menu: [
					{
						id: 'first',
						title: 'first',
						submenu: [{ id: 'nested', title: 'nested' }],
					},
				],
			},
		});
		expect(getByText('first')).not.toBeVisible();
		await userEvent.click(getByTestId('test-trigger'));
		expect(getByText('first')).toBeVisible();

		expect(getByText('nested')).not.toBeVisible();
		await userEvent.hover(getByTestId('navigation-submenu'));
		await waitFor(() => expect(getByText('nested')).toBeVisible());

		await userEvent.pointer([
			{ target: getByTestId('navigation-submenu') },
			{ target: getByTestId('test-trigger') },
		]);
		await waitFor(() => expect(getByText('nested')).not.toBeVisible());
	});
});
