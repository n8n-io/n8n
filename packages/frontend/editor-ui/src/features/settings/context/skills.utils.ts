import { SKILLS_SORT_OPTIONS, type SkillListItem, type SkillSortOption } from '@n8n/api-types';
import type { IconName, TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectType } from '@/features/collaboration/projects/projects.types';
import { splitName } from '@/features/collaboration/projects/projects.utils';

import { SKILLS_DEFAULT_SORT_BY } from './context.constants';

export type SkillScopeDisplay = { icon: IconName; label: string };

/** How the badge and the modal name the scope of a skill. */
export function useSkillScopeDisplay() {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();

	function projectLabel(
		projectId: string,
		projectName: string | null,
		// The projects store also knows public projects. Only `personal` changes the label.
		projectType: SkillListItem['projectType'] | ProjectType,
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
		skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType' | 'agentName'>,
	): SkillScopeDisplay {
		switch (skill.scope) {
			case 'instance':
				return { icon: 'globe', label: i18n.baseText('settings.context.skills.scope.instance') };
			case 'agent':
				return {
					icon: 'bot',
					label: skill.agentName
						? i18n.baseText('settings.context.skills.scope.agent', {
								interpolate: { name: skill.agentName },
							})
						: i18n.baseText('settings.context.skills.scope.agentFallback'),
				};
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

	return { scopeDisplay, projectLabel };
}

/** The table sort as the list endpoint takes it. A column the endpoint cannot sort is dropped. */
export function toSkillSortOption(sortBy: TableOptions['sortBy']): SkillSortOption | undefined {
	const [sort] = sortBy.length > 0 ? sortBy : SKILLS_DEFAULT_SORT_BY;
	const option = `${sort.id}:${sort.desc ? 'desc' : 'asc'}`;
	return SKILLS_SORT_OPTIONS.find((candidate) => candidate === option);
}
