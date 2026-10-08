import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IMenuItem } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { useSettingsCommands } from './useSettingsCommands';

const routerPushMock = vi.fn();
const handleSettingsItemSelectMock = vi.fn();
const settingsItems = ref<IMenuItem[]>([]);

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPushMock }),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/app/composables/useSettingsItems', () => ({
	useSettingsItems: () => ({
		settingsItems,
		handleSettingsItemSelect: handleSettingsItemSelectMock,
	}),
}));

describe('useSettingsCommands', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settingsItems.value = [
			{
				id: 'settings-usage-and-plan',
				label: 'Usage and plan',
				icon: 'chart-bar',
				route: { to: { name: VIEWS.USAGE } },
			},
			{ id: 'settings-log-streaming', label: 'Log streaming' },
		];
	});

	it('maps each settings item to a command in the settings section', () => {
		expect(useSettingsCommands().commands.value).toEqual([
			{
				id: 'settings-usage-and-plan',
				title: 'Usage and plan',
				section: 'settings',
				keywords: ['settings'],
				icon: { type: 'icon', value: 'chart-bar' },
				handler: expect.any(Function),
			},
			{
				id: 'settings-log-streaming',
				title: 'Log streaming',
				section: 'settings',
				keywords: ['settings'],
				icon: undefined,
				handler: expect.any(Function),
			},
		]);
	});

	it('follows changes to the settings items', () => {
		const { commands } = useSettingsCommands();

		settingsItems.value = [];

		expect(commands.value).toEqual([]);
	});

	it('navigates to the item route and then selects the item when the handler runs', async () => {
		const callOrder: string[] = [];
		routerPushMock.mockImplementation(async () => {
			await Promise.resolve();
			callOrder.push('push');
		});
		handleSettingsItemSelectMock.mockImplementation(async () => {
			callOrder.push('select');
		});

		await useSettingsCommands().commands.value[0].handler?.();

		expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.USAGE });
		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-usage-and-plan');
		expect(callOrder).toEqual(['push', 'select']);
	});

	it('only selects the item when it has no route', async () => {
		await useSettingsCommands().commands.value[1].handler?.();

		expect(routerPushMock).not.toHaveBeenCalled();
		expect(handleSettingsItemSelectMock).toHaveBeenCalledWith('settings-log-streaming');
	});
});
