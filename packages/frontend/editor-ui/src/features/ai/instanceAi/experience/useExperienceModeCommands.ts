import { computed, type ComputedRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, type CommandBarItem } from '@n8n/design-system';
import { oppositeExperienceMode } from './experienceMode';
import { useExperienceMode } from './useExperienceMode';

const KEYWORDS = ['interface', 'mode', 'experience', 'simple', 'power'];

/**
 * The command bar entry that switches to the other mode. Every user sees it
 * while experience modes are on, also a user who cannot open the Assistant.
 */
export function useExperienceModeCommands(): ComputedRef<CommandBarItem[]> {
	const i18n = useI18n();
	const experience = useExperienceMode();

	return computed(() => {
		if (!experience.isEnabled.value) return [];

		const target = oppositeExperienceMode(experience.mode.value);
		return [
			{
				id: 'experience-mode-switch',
				title: i18n.baseText(`experienceMode.command.switchTo.${target}`),
				section: i18n.baseText('commandBar.sections.instanceAi'),
				icon: { component: N8nIcon, props: { icon: 'toggle-right' } },
				keywords: KEYWORDS,
				handler: async () => {
					await experience.setMode(target, { announce: true });
				},
			},
		];
	});
}
