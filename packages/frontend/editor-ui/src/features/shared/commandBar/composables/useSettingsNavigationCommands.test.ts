import { computed, ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { IMenuSettingItem } from '@n8n/frontend-module-sdk';
import type { SettingsSectionGroup } from '@/app/composables/useSettingsItems';
import type { CommandBarLocalSource } from '../types';
import { useSettingsNavigationCommands } from './useSettingsNavigationCommands';

vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));

const currentRoute = ref({ fullPath: '/home' });
const push = vi.fn();
// Resolves `{ name }` to `/<name>` and keeps the hash, like vue-router does for a flat route table.
const resolve = (to: RouteLocationRaw) => {
	if (typeof to === 'string') return { path: to, query: {}, href: to, fullPath: to };
	const path = 'path' in to && to.path ? to.path : `/${String('name' in to ? to.name : '')}`;
	const hash = to.hash ?? '';
	return { path, query: {}, href: `${path}${hash}`, fullPath: `${path}${hash}` };
};
vi.mock('vue-router', () => ({ useRouter: () => ({ currentRoute, push, resolve }) }));

const revealSettingsAnchor = vi.fn();
const anchorElement = document.createElement('div');
vi.mock('@/app/composables/useSettingsAnchorScroll', () => ({
	findSettingsAnchor: () => anchorElement,
	revealSettingsAnchor: (element: HTMLElement) => revealSettingsAnchor(element),
}));

const personal: IMenuSettingItem = {
	id: 'settings-personal',
	label: 'Personal',
	icon: 'circle-user-round',
	route: { to: { name: 'personal' } },
	searchEntries: [
		{ anchor: 'theme', label: 'Theme', group: 'Personalization', keywords: ['dark mode'] },
		{ anchor: 'hidden', label: 'Hidden setting', available: false },
	],
};
const credits: IMenuSettingItem = { id: 'settings-n8n-connect', label: 'Gateway credits' };

const handleSettingsItemSelect = vi.fn();
const settingsSections = ref<SettingsSectionGroup[]>([
	{ id: 'personal', title: 'Personal section', items: [personal] },
	{ id: 'billing', title: 'Billing', items: [credits] },
]);
vi.mock('@/app/composables/useSettingsItems', () => ({
	useSettingsItems: () => ({
		settingsSections: computed(() => settingsSections.value),
		handleSettingsItemSelect,
	}),
}));

function search(query: string) {
	const { source } = useSettingsNavigationCommands();
	if (source?.isRemote !== false) throw new Error('Expected a local source');
	const localSource: CommandBarLocalSource = source;
	return localSource.search({ query, offset: 0, limit: 20 }).items;
}

describe('useSettingsNavigationCommands', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		currentRoute.value = { fullPath: '/home' };
	});

	it('lists every visible page and its available settings', () => {
		expect(search('').map(({ id }) => id)).toEqual([
			'settings-page:settings-personal',
			'settings-entry:settings-personal:theme',
			'settings-page:settings-n8n-connect',
		]);
	});

	it('finds a setting by keyword and shows where it is', () => {
		const [theme] = search('dark mode');

		expect(theme).toMatchObject({
			id: 'settings-entry:settings-personal:theme',
			title: 'Theme',
			description: 'Personal section › Personal › Personalization',
			href: '/personal#theme',
		});
	});

	it('opens the page at the setting', async () => {
		const [theme] = search('dark mode');
		await theme.handler?.();

		expect(push).toHaveBeenCalledWith({ path: '/personal', query: {}, hash: '#theme' });
		expect(revealSettingsAnchor).not.toHaveBeenCalled();
	});

	it('reveals the setting directly when its page is already open at it', async () => {
		currentRoute.value = { fullPath: '/personal#theme' };
		const [theme] = search('dark mode');
		await theme.handler?.();

		expect(push).not.toHaveBeenCalled();
		expect(revealSettingsAnchor).toHaveBeenCalledWith(anchorElement);
	});

	it('runs the page action for a page without a route', async () => {
		const [page] = search('Gateway credits');
		await page.handler?.();

		expect(push).not.toHaveBeenCalled();
		expect(handleSettingsItemSelect).toHaveBeenCalledWith('settings-n8n-connect');
	});
});
