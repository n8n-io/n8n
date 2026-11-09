import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { isContextSkillsEnabled } from '@/features/settings/context/context.utils';
import type { CommandGroup, CommandBarItem } from '../types';

const ITEM_ID = {
	SKILLS: 'context-skills',
	PREFERENCES: 'context-preferences',
} as const;

/** Navigation to the Context settings pages. The Skills entry follows the skills module. */
export function useContextCommands(): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();

	const commands = computed<CommandBarItem[]>(() => {
		const section = i18n.baseText('commandBar.sections.general');
		const contextKeyword = i18n.baseText('commandBar.context.keywords.context').toLowerCase();
		const items: CommandBarItem[] = [];

		if (isContextSkillsEnabled()) {
			const title = i18n.baseText('commandBar.context.skills');
			items.push({
				id: ITEM_ID.SKILLS,
				title,
				section,
				handler: () => {
					void router.push({ name: VIEWS.SETTINGS_CONTEXT_SKILLS });
				},
				icon: {
					component: N8nIcon,
					props: { icon: 'book-open' },
				},
				keywords: [title.toLowerCase(), contextKeyword],
			});
		}

		const preferencesTitle = i18n.baseText('commandBar.context.preferences');
		items.push({
			id: ITEM_ID.PREFERENCES,
			title: preferencesTitle,
			section,
			handler: () => {
				void router.push({ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES });
			},
			icon: {
				component: N8nIcon,
				props: { icon: 'sliders-horizontal' },
			},
			keywords: [preferencesTitle.toLowerCase(), contextKeyword],
		});

		return items;
	});

	return { commands };
}
