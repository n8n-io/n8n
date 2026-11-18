import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { AppliedThemeOption, ThemeFamily, ThemeMode } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import { hasThemeVariant } from '@/app/stores/ui.utils';
import { customTheme } from '@/app/utils/customTheme';

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
	solarized: 'settings.personal.theme.solarized',
	github: 'settings.personal.theme.github',
	'rose-pine': 'settings.personal.theme.rosePine',
	'n8n-extreme': 'settings.personal.theme.n8nExtreme',
	custom: 'settings.personal.theme.custom',
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
	'solarized',
	'github',
	'rose-pine',
	'n8n-extreme',
	'custom',
];

const THEME_MODE_SUFFIXED_LABELS: Record<AppliedThemeOption, BaseTextKey> = {
	light: 'settings.personal.theme.withLightMode',
	dark: 'settings.personal.theme.withDarkMode',
};

/** The name of a family in one mode. Only a family with both variants gets the mode in its name. */
function useThemeFamilyLabel() {
	const i18n = useI18n();

	return (family: ThemeFamily, mode: AppliedThemeOption) => {
		if (family === 'custom' && customTheme.value?.name.trim()) return customTheme.value.name.trim();
		const name = i18n.baseText(THEME_FAMILY_LABELS[family]);
		const hasBothVariants = hasThemeVariant(family, 'light') && hasThemeVariant(family, 'dark');
		return hasBothVariants
			? i18n.baseText(THEME_MODE_SUFFIXED_LABELS[mode], { interpolate: { name } })
			: name;
	};
}

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

/** The family that the screen shows: the slot for the resolved mode. */
export function useActiveThemeFamily() {
	const uiStore = useUIStore();

	return computed<ThemeFamily>(() => uiStore.themeFamily);
}

/**
 * The theme families that have a variant for a mode, in display order. The mode defaults to the
 * resolved mode, so `system` follows the OS. The theme menus share this list. The rows have no icon.
 */
export function useThemeFamilyOptions(mode?: MaybeRefOrGetter<AppliedThemeOption>) {
	const familyLabel = useThemeFamilyLabel();
	const uiStore = useUIStore();

	return computed(() => {
		const targetMode = mode === undefined ? uiStore.appliedTheme : toValue(mode);
		return THEME_FAMILY_ORDER.filter((value) => hasThemeVariant(value, targetMode)).map(
			(value) => ({
				value,
				label: familyLabel(value, targetMode),
			}),
		);
	});
}

/**
 * One option for each variant of each family. The variants of the current mode come first,
 * then the variants of the other mode.
 */
export function useThemeVariantOptions() {
	const i18n = useI18n();
	const familyLabel = useThemeFamilyLabel();
	const uiStore = useUIStore();

	return computed(() => {
		const current = uiStore.appliedTheme;
		const modes: AppliedThemeOption[] = current === 'dark' ? ['dark', 'light'] : ['light', 'dark'];

		return modes.flatMap((mode) =>
			THEME_FAMILY_ORDER.filter((value) => hasThemeVariant(value, mode)).map((value) => ({
				mode,
				value,
				isCurrentMode: mode === current,
				label: familyLabel(value, mode),
				modeLabel: i18n.baseText(THEME_MODE_DISPLAY[mode].label),
			})),
		);
	});
}
