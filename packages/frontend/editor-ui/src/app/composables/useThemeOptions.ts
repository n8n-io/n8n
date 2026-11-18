import { computed } from 'vue';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { AppliedThemeOption, ThemeFamily, ThemeMode } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import { hasThemeVariant } from '@/app/stores/ui.utils';

// The record types make a new mode or family fail to compile until it has a label (and an icon).
const THEME_MODE_DISPLAY: Record<ThemeMode, { label: BaseTextKey; icon: IconName }> = {
	system: { label: 'settings.personal.theme.systemDefault', icon: 'monitor' },
	light: { label: 'settings.personal.theme.light', icon: 'sun' },
	dark: { label: 'settings.personal.theme.dark', icon: 'moon' },
};

const THEME_MODE_ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const THEME_FAMILY_LABELS: Record<ThemeFamily, BaseTextKey> = {
	default: 'settings.personal.theme.default',
	catppuccin: 'settings.personal.theme.catppuccin',
	dracula: 'settings.personal.theme.dracula',
	'high-contrast': 'settings.personal.theme.highContrast',
	gruvbox: 'settings.personal.theme.gruvbox',
	oxocarbon: 'settings.personal.theme.oxocarbon',
	cyberdream: 'settings.personal.theme.cyberdream',
	moonfly: 'settings.personal.theme.moonfly',
	nightfly: 'settings.personal.theme.nightfly',
};

const THEME_FAMILY_ORDER: ThemeFamily[] = [
	'default',
	'catppuccin',
	'dracula',
	'high-contrast',
	'gruvbox',
	'oxocarbon',
	'cyberdream',
	'moonfly',
	'nightfly',
];

/** Every mode the user can pick, in display order. The mode menus share this list. */
export function useThemeModeOptions() {
	const i18n = useI18n();

	return computed(() =>
		THEME_MODE_ORDER.map((value) => ({
			value,
			label: i18n.baseText(THEME_MODE_DISPLAY[value].label),
			icon: THEME_MODE_DISPLAY[value].icon,
		})),
	);
}

/**
 * The family that the screen shows. The store resets a saved family that has no variant for a new mode.
 * This is a safety net for a saved family that is stale at boot, for example after an OS change.
 */
export function useActiveThemeFamily() {
	const uiStore = useUIStore();

	return computed<ThemeFamily>(() =>
		hasThemeVariant(uiStore.themeFamily, uiStore.appliedTheme) ? uiStore.themeFamily : 'default',
	);
}

/**
 * The theme families that have a variant for the current mode, in display order.
 * The mode is the resolved mode, so `system` follows the OS. The theme menus share this list.
 * The rows have no icon.
 */
export function useThemeFamilyOptions() {
	const i18n = useI18n();
	const uiStore = useUIStore();

	return computed(() =>
		THEME_FAMILY_ORDER.filter((value) => hasThemeVariant(value, uiStore.appliedTheme)).map(
			(value) => ({
				value,
				label: i18n.baseText(THEME_FAMILY_LABELS[value]),
			}),
		),
	);
}

/**
 * One option for each variant of each family. The variants of the current mode come first,
 * then the variants of the other mode.
 */
export function useThemeVariantOptions() {
	const i18n = useI18n();
	const uiStore = useUIStore();

	return computed(() => {
		const current = uiStore.appliedTheme;
		const modes: AppliedThemeOption[] = current === 'dark' ? ['dark', 'light'] : ['light', 'dark'];

		return modes.flatMap((mode) =>
			THEME_FAMILY_ORDER.filter((value) => hasThemeVariant(value, mode)).map((value) => ({
				mode,
				value,
				isCurrentMode: mode === current,
				label: i18n.baseText(THEME_FAMILY_LABELS[value]),
				modeLabel: i18n.baseText(THEME_MODE_DISPLAY[mode].label),
			})),
		);
	});
}
