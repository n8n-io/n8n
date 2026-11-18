import { computed } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import type { IMenuSettingItem } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useSettingsItems } from '@/app/composables/useSettingsItems';
import {
	findSettingsAnchor,
	revealSettingsAnchor,
} from '@/app/composables/useSettingsAnchorScroll';
import { paginate, rankItems } from '../commandBar.utils';
import type { CommandBarItem, CommandBarSearchRequest, CommandGroup } from '../types';

export const SETTINGS_COMMAND_SOURCE_ID = 'settings';

const BREADCRUMB_SEPARATOR = ' › ';

function toIcon(icon: IMenuSettingItem['icon']): CommandBarItem['icon'] {
	if (!icon) return undefined;
	return typeof icon === 'string' ? { type: 'icon', value: icon } : icon;
}

/** Settings pages, and the settings on them, as one command bar source. */
export function useSettingsNavigationCommands(): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const { settingsSections, handleSettingsItemSelect } = useSettingsItems();

	function withAnchor(to: RouteLocationRaw, anchor: string): RouteLocationRaw {
		const { path, query } = router.resolve(to);
		return { path, query, hash: `#${anchor}` };
	}

	function toItems(item: IMenuSettingItem, sectionTitle?: string): CommandBarItem[] {
		const to = item.route?.to;
		const page: CommandBarItem = {
			id: `settings-page:${item.id}`,
			title: item.label,
			description: sectionTitle,
			section: i18n.baseText('commandBar.settings.pages'),
			icon: toIcon(item.icon),
			keywords: [...(item.searchKeywords ?? []), ...(sectionTitle ? [sectionTitle] : [])],
			href: to ? router.resolve(to).href : undefined,
			handler: async () => {
				if (to) await router.push(to);
				await handleSettingsItemSelect(item.id);
			},
		};

		if (!to) return [page];

		const entries = (item.searchEntries ?? [])
			.filter((entry) => entry.available !== false)
			.map<CommandBarItem>((entry) => {
				const location = withAnchor(to, entry.anchor);
				return {
					id: `settings-entry:${item.id}:${entry.anchor}`,
					title: entry.label,
					description: [sectionTitle, item.label, entry.group]
						.filter(Boolean)
						.join(BREADCRUMB_SEPARATOR),
					section: i18n.baseText('commandBar.settings.options'),
					icon: { type: 'icon', value: 'corner-down-right' },
					keywords: [...(entry.keywords ?? []), ...(entry.group ? [entry.group] : []), item.label],
					href: router.resolve(location).href,
					handler: async () => {
						if (router.resolve(location).fullPath === router.currentRoute.value.fullPath) {
							// Pushing the current URL does nothing, so reveal the setting here instead.
							const element = findSettingsAnchor(document, entry.anchor);
							if (element) revealSettingsAnchor(element);
							return;
						}
						await router.push(location);
					},
				};
			});

		return [page, ...entries];
	}

	const items = computed(() =>
		settingsSections.value.flatMap((section) =>
			section.items.flatMap((item) => toItems(item, section.title)),
		),
	);

	function search({ query, offset, limit }: CommandBarSearchRequest) {
		return paginate(rankItems(items.value, query), { offset, limit });
	}

	return {
		commands: computed<CommandBarItem[]>(() => []),
		source: {
			id: SETTINGS_COMMAND_SOURCE_ID,
			title: i18n.baseText('commandBar.sections.settings'),
			placeholder: i18n.baseText('commandBar.settings.placeholder'),
			isRemote: false,
			isAvailable: () => items.value.length > 0,
			search,
		},
	};
}
