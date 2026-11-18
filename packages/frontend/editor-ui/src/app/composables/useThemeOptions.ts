import { computed } from 'vue';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { ThemeOption } from '@/Interface';

// The record type makes a new theme fail to compile until it has a label and an icon.
const THEME_OPTION_DISPLAY: Record<ThemeOption, { label: BaseTextKey; icon: IconName }> = {
	system: { label: 'settings.personal.theme.systemDefault', icon: 'monitor' },
	light: { label: 'settings.personal.theme.light', icon: 'sun' },
	dark: { label: 'settings.personal.theme.dark', icon: 'moon' },
	'catppuccin-latte': { label: 'settings.personal.theme.catppuccinLatte', icon: 'palette' },
	dracula: { label: 'settings.personal.theme.dracula', icon: 'palette' },
};

const THEME_OPTION_ORDER: ThemeOption[] = [
	'system',
	'light',
	'dark',
	'catppuccin-latte',
	'dracula',
];

/** Every theme the user can pick, in display order. The theme menus share this list. */
export function useThemeOptions() {
	const i18n = useI18n();

	return computed(() =>
		THEME_OPTION_ORDER.map((value) => ({
			value,
			label: i18n.baseText(THEME_OPTION_DISPLAY[value].label),
			icon: THEME_OPTION_DISPLAY[value].icon,
		})),
	);
}
