import { defineComponent, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsSidebar from './SettingsSidebar.vue';

const handleSettingsItemSelectMock = vi.hoisted(() => vi.fn());

vi.mock('../composables/useSettingsItems', () => ({
	useSettingsItems: () => ({
		settingsItems: ref([
			{
				id: 'settings-n8n-connect',
				label: 'Gateway credits',
			},
			{
				id: 'settings-users',
				label: 'Users',
				route: { to: { name: 'UsersSettings' } },
			},
			{
				id: 'settings-sso',
				label: 'SSO',
				route: { to: { name: 'SSoSettings' } },
				activateOnRouteNames: ['SSoSettings', 'ScimSettings'],
			},
		]),
		handleSettingsItemSelect: handleSettingsItemSelectMock,
	}),
}));

vi.mock('../composables/useAiGateway', () => ({
	useAiGateway: () => ({
		fetchWallet: vi.fn(),
		isEnabled: ref(false),
	}),
}));

const view = { template: '<div />' };

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/settings',
			children: [
				{ path: 'users', name: 'UsersSettings', component: view },
				{ path: 'sso', name: 'SSoSettings', component: view },
				// Module sub-pages are flat children of `/settings`, not of the SSO route.
				{ path: 'sso/scim', name: 'ScimSettings', component: view },
				{ path: 'ssox', name: 'SsoxSettings', component: view },
			],
		},
	],
});

// Expose the `active` prop. `default: undefined` keeps an absent prop from casting to `false`.
const MenuItemStub = defineComponent({
	props: {
		item: { type: Object, required: true },
		active: { type: Boolean, default: undefined },
	},
	template: `
		<div :data-test-id="item.id" :data-active="active === undefined ? 'unset' : String(active)">
			{{ item.label }}
		</div>
	`,
});

const renderComponent = createComponentRenderer(SettingsSidebar, {
	pinia: createTestingPinia(),
	global: {
		plugins: [router],
		// The stub key is the SFC name (`MenuItem.vue`), because `<script setup>` registers no name.
		stubs: { MenuItem: MenuItemStub },
	},
});

describe('SettingsSidebar', () => {
	it('delegates settings item clicks', () => {
		const { getByText } = renderComponent();
		getByText('Gateway credits').click();

		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-n8n-connect');
	});

	describe('route highlight', () => {
		it.each([
			['/settings/sso', 'true'],
			['/settings/sso/scim', 'true'],
			['/settings/ssox', 'false'],
			['/settings/users', 'false'],
		])('on %s sets the SSO item active to %s', async (path, expected) => {
			await router.push(path);

			const { getByTestId } = renderComponent();

			expect(getByTestId('settings-sso')).toHaveAttribute('data-active', expected);
		});

		it('passes no active prop to items without explicit route matches', async () => {
			await router.push('/settings/users');

			const { getByTestId } = renderComponent();

			// These items keep the `router-link-active` highlight from vue-router.
			expect(getByTestId('settings-users')).toHaveAttribute('data-active', 'unset');
			expect(getByTestId('settings-n8n-connect')).toHaveAttribute('data-active', 'unset');
		});
	});
});
