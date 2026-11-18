import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { WHATS_NEW_MODAL_KEY, VIEWS, ABOUT_MODAL_KEY } from '@/app/constants';
import { EXTERNAL_LINKS } from '@/app/constants/externalLinks';
import { useBugReporting } from '@/app/composables/useBugReporting';
import {
	useActiveThemeFamily,
	useThemeModeOptions,
	useThemeVariantOptions,
} from '@/app/composables/useThemeOptions';
import type { CommandGroup, CommandBarItem, ThemeCommandBarItem } from '../types';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';

const ITEM_ID = {
	CHAT_HUB: 'chat-hub',
	WHATS_NEW: 'whats-new',
	SETTINGS: 'settings',
	THEME: 'theme',
	THEME_MODE: 'theme-mode',
	SIGN_OUT: 'sign-out',
	TEMPLATES: 'templates',
	VARIABLES: 'variables',
	INSIGHTS: 'insights',
	QUICKSTART: 'quickstart',
	DOCUMENTATION: 'documentation',
	FORUM: 'forum',
	COURSE: 'course',
	REPORT_BUG: 'report-bug',
	ABOUT: 'about',
} as const;

export function useGenericCommands(): CommandGroup {
	const i18n = useI18n();
	const uiStore = useUIStore();
	const router = useRouter();
	const settingsStore = useSettingsStore();
	const projectsStore = useProjectsStore();
	const templatesStore = useTemplatesStore();
	const { getReportingURL } = useBugReporting();
	const modeOptions = useThemeModeOptions();
	const variantOptions = useThemeVariantOptions();
	const activeFamily = useActiveThemeFamily();

	const modeCommands = computed<ThemeCommandBarItem[]>(() =>
		modeOptions.value.map((option): ThemeCommandBarItem => {
			const isCurrent = uiStore.themeMode === option.value;

			return {
				id: `${ITEM_ID.THEME_MODE}-${option.value}`,
				// The command bar previews this mode, with the saved family, while the item is highlighted.
				theme: { mode: option.value },
				title: option.label,
				icon: {
					component: N8nIcon,
					props: {
						icon: option.icon,
					},
				},
				description: isCurrent ? i18n.baseText('commandBar.mode.current') : undefined,
				descriptionIcon: isCurrent ? { type: 'icon', value: 'check' } : undefined,
				handler: () => {
					uiStore.setThemeMode(option.value);
				},
			};
		}),
	);

	const sortedVariantOptions = computed(() => {
		const options = variantOptions.value;
		const index = options.findIndex(
			(option) => option.isCurrentMode && option.value === activeFamily.value,
		);
		if (index <= 0) return options;
		return [options[index], ...options.slice(0, index), ...options.slice(index + 1)];
	});

	const themeCommands = computed<ThemeCommandBarItem[]>(() =>
		sortedVariantOptions.value.map((option): ThemeCommandBarItem => {
			const isCurrent = option.isCurrentMode && activeFamily.value === option.value;

			return {
				id: `${ITEM_ID.THEME}-${option.mode}-${option.value}`,
				// A row of the other mode previews its mode too, so the whole look changes.
				theme: option.isCurrentMode
					? { family: option.value }
					: { mode: option.mode, family: option.value },
				title: option.label,
				section: option.modeLabel,
				keywords: [option.label.toLowerCase(), option.modeLabel.toLowerCase()],
				description: isCurrent ? i18n.baseText('commandBar.theme.current') : undefined,
				descriptionIcon: isCurrent ? { type: 'icon', value: 'check' } : undefined,
				handler: () => {
					// A current-mode row keeps `system`. An other-mode row pins that mode.
					uiStore.setThemeFamily(option.value, option.mode);
					if (!option.isCurrentMode) uiStore.setThemeMode(option.mode);
				},
			};
		}),
	);

	const genericCommands = computed<CommandBarItem[]>(() => [
		{
			id: ITEM_ID.WHATS_NEW,
			title: i18n.baseText('mainSidebar.whatsNew'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				uiStore.openModal(WHATS_NEW_MODAL_KEY);
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'bell',
				},
			},
			keywords: [
				i18n.baseText('mainSidebar.whatsNew').toLowerCase(),
				i18n.baseText('mainSidebar.whatsNew.fullChangelog').toLowerCase(),
			],
		},
		...(settingsStore.isChatFeatureEnabled
			? [
					{
						id: ITEM_ID.CHAT_HUB,
						title: i18n.baseText('projects.menu.chat'),
						section: i18n.baseText('commandBar.sections.general'),
						handler: () => {
							void router.push({ name: CHAT_VIEW, force: true });
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'message-circle',
							},
						},
						keywords: ['chat', 'open chat', i18n.baseText('projects.menu.chat').toLowerCase()],
					},
				]
			: []),
		...(projectsStore.canViewProjects
			? [
					{
						id: ITEM_ID.TEMPLATES,
						title: i18n.baseText('generic.templates'),
						section: i18n.baseText('commandBar.sections.general'),
						handler: () => {
							if (templatesStore.hasCustomTemplatesHost) {
								void router.push({ name: VIEWS.TEMPLATES });
							} else {
								window.open(templatesStore.websiteTemplateRepositoryURL, '_blank');
							}
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'package-open',
							},
						},
						keywords: [i18n.baseText('generic.templates').toLowerCase()],
					},
				]
			: []),
		...(projectsStore.canViewProjects
			? [
					{
						id: ITEM_ID.VARIABLES,
						title: i18n.baseText('mainSidebar.variables'),
						section: i18n.baseText('commandBar.sections.general'),
						handler: () => {
							void router.push({ name: VIEWS.HOME_VARIABLES });
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'variable',
							},
						},
						keywords: [i18n.baseText('mainSidebar.variables').toLowerCase()],
					},
				]
			: []),
		...(projectsStore.canViewProjects
			? [
					{
						id: ITEM_ID.INSIGHTS,
						title: 'Insights',
						section: i18n.baseText('commandBar.sections.general'),
						handler: () => {
							void router.push({ name: VIEWS.INSIGHTS });
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'chart-column-decreasing',
							},
						},
						keywords: ['insights'],
					},
				]
			: []),
		{
			id: ITEM_ID.QUICKSTART,
			title: i18n.baseText('mainSidebar.helpMenuItems.quickstart'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.QUICKSTART_VIDEO, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'video',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.quickstart').toLowerCase()],
		},
		{
			id: ITEM_ID.DOCUMENTATION,
			title: i18n.baseText('mainSidebar.helpMenuItems.documentation'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.DOCUMENTATION, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'book',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.documentation').toLowerCase()],
		},
		{
			id: ITEM_ID.FORUM,
			title: i18n.baseText('mainSidebar.helpMenuItems.forum'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.FORUM, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'users',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.forum').toLowerCase()],
		},
		{
			id: ITEM_ID.COURSE,
			title: i18n.baseText('mainSidebar.helpMenuItems.course'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.COURSES, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'graduation-cap',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.course').toLowerCase()],
		},
		{
			id: ITEM_ID.REPORT_BUG,
			title: i18n.baseText('mainSidebar.helpMenuItems.reportBug'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(getReportingURL(), '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'bug',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.reportBug').toLowerCase()],
		},
		{
			id: ITEM_ID.ABOUT,
			title: i18n.baseText('mainSidebar.aboutN8n'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				uiStore.openModal(ABOUT_MODAL_KEY);
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'info',
				},
			},
			keywords: [i18n.baseText('mainSidebar.aboutN8n').toLowerCase()],
		},
		{
			id: ITEM_ID.THEME_MODE,
			title: i18n.baseText('commandBar.mode.change'),
			section: i18n.baseText('commandBar.sections.general'),
			placeholder: i18n.baseText('commandBar.mode.searchPlaceholder'),
			children: modeCommands.value,
			icon: {
				component: N8nIcon,
				props: {
					icon: 'contrast',
				},
			},
			keywords: ['mode', 'dark', 'light', 'system', 'day', 'night', 'appearance'],
		},
		{
			id: ITEM_ID.THEME,
			title: i18n.baseText('commandBar.theme.change'),
			section: i18n.baseText('commandBar.sections.general'),
			placeholder: i18n.baseText('commandBar.theme.searchPlaceholder'),
			children: themeCommands.value,
			icon: {
				component: N8nIcon,
				props: {
					icon: 'palette',
				},
			},
			keywords: [
				'theme',
				'catppuccin',
				'mocha',
				'dracula',
				'high contrast',
				'accessibility',
				'github',
				'gruvbox',
				'oxocarbon',
				'cyberdream',
				'moonfly',
				'nightfly',
				'colors',
				'appearance',
			],
		},
		{
			id: ITEM_ID.SETTINGS,
			title: i18n.baseText('settings'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				void router.push({ name: VIEWS.SETTINGS });
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'cog',
				},
			},
			keywords: [i18n.baseText('settings').toLowerCase()],
		},
		{
			id: ITEM_ID.SIGN_OUT,
			title: i18n.baseText('auth.signout'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				void router.push({ name: VIEWS.SIGNOUT });
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'sign-out-alt',
				},
			},
			keywords: [i18n.baseText('auth.signout').toLowerCase()],
		},
	]);

	return {
		commands: genericCommands,
	};
}
