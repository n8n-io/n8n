import type { SkillListItem } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';

export type SkillScopeDisplay = { icon: IconName; label: string };

/** How the badge and the modal name the scope of a skill. */
export function useSkillScopeDisplay() {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();

	function projectLabel(
		projectId: string,
		projectName: string | null,
		projectType: SkillListItem['projectType'],
	) {
		if (projectId === projectsStore.personalProject?.id) {
			return i18n.baseText('settings.context.skills.scope.personalProject');
		}
		if (projectType === 'personal' && projectName) {
			// A personal project is named `First Last <email>`; the owner is the name part.
			const { name, email } = splitName(projectName);
			return name ?? email ?? projectName;
		}
		// A project the viewer cannot read is still listed, so fall back to a neutral label.
		return projectName ?? i18n.baseText('settings.context.skills.scope.project');
	}

	function scopeDisplay(
		skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType'>,
	): SkillScopeDisplay {
		switch (skill.scope) {
			case 'instance':
				return { icon: 'globe', label: i18n.baseText('settings.context.skills.scope.instance') };
			case 'project':
				if (!skill.projectId) {
					return { icon: 'layers', label: i18n.baseText('settings.context.skills.scope.project') };
				}
				return {
					icon: skill.projectType === 'personal' ? 'user' : 'layers',
					label: projectLabel(skill.projectId, skill.projectName, skill.projectType),
				};
		}
	}

	return { scopeDisplay };
}
