import { useSidePanelStore } from '@n8n/frontend-module-ui-extensions';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { reactive } from 'vue';

import { useAppSidePanelLayout } from './useAppSidePanelLayout';

const route = reactive<{ meta: { layout?: string } }>({ meta: {} });

vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => route),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

describe(useAppSidePanelLayout, () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createTestingPinia({ stubActions: false }));
		route.meta = {};
		useSettingsStore().setSettings({ ...defaultSettings, activeModules: ['ui-extensions'] });
		const usersStore = useUsersStore();
		usersStore.addUsers([{ id: 'user-1', email: 'a@b.c', isPending: false, mfaEnabled: false }]);
		usersStore.currentUserId = 'user-1';
	});

	it('shows the rail on a page behind the login', () => {
		const { isVisible, width } = useAppSidePanelLayout();

		expect(isVisible.value).toBe(true);
		expect(width.value).toBe(40);
	});

	it('adds the panel width while the panel is open', () => {
		const { width } = useAppSidePanelLayout();
		const store = useSidePanelStore();

		store.isOpen = true;
		store.width = 400;

		expect(width.value).toBe(440);
	});

	it.each(['auth', 'demo'])('hides the panel in the %s layout', (layout) => {
		route.meta = { layout };

		const { isVisible, width } = useAppSidePanelLayout();

		expect(isVisible.value).toBe(false);
		expect(width.value).toBe(0);
	});

	it('hides the panel while the module is inactive', () => {
		const { isVisible } = useAppSidePanelLayout();
		expect(isVisible.value).toBe(true);

		useSettingsStore().setSettings({ ...defaultSettings, activeModules: [] });

		expect(isVisible.value).toBe(false);
	});

	it('hides the panel before the login', () => {
		const { isVisible } = useAppSidePanelLayout();

		useUsersStore().currentUserId = null;

		expect(isVisible.value).toBe(false);
	});
});
