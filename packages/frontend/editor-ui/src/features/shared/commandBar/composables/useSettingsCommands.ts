import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useSettingsItems } from '@/app/composables/useSettingsItems';
import { toCommandBarIcon } from '../commandBar.utils';
import type { CommandBarItem, CommandGroup } from '../types';

export function useSettingsCommands(): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const { settingsItems, handleSettingsItemSelect } = useSettingsItems();

	const settingsCommands = computed<CommandBarItem[]>(() =>
		settingsItems.value.map((menuItem) => ({
			id: menuItem.id,
			title: menuItem.label,
			section: i18n.baseText('settings'),
			keywords: [i18n.baseText('settings')],
			icon: toCommandBarIcon(menuItem.icon),
			handler: async () => {
				if (menuItem.route?.to) {
					await router.push(menuItem.route.to);
				}
				await handleSettingsItemSelect(menuItem.id);
			},
		})),
	);

	return {
		commands: settingsCommands,
	};
}
