import { computed } from 'vue';
import type { SkillListItem } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentSkillEditorScopeOption } from '@/features/agents/components/AgentSkillEditor.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';

import { canWriteInstanceSkillScope, canWriteProjectSkillScope } from './context.utils';

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

	return { scopeDisplay };
}

const INSTANCE_SCOPE = 'instance';
const PROJECT_SCOPE_PREFIX = 'project:';

/**
 * Where a new skill can live: the instance, the personal project and the team projects
 * that the user may write to. An agent skill is made from inside its agent, not here.
 */
export function useSkillScopeOptions() {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();

	const scopeOptions = computed<AgentSkillEditorScopeOption[]>(() => {
		const options: AgentSkillEditorScopeOption[] = [];
		if (canWriteInstanceSkillScope()) {
			options.push({
				value: INSTANCE_SCOPE,
				label: i18n.baseText('settings.context.skills.scope.instance'),
				icon: 'globe',
			});
		}
		const personalProject = projectsStore.personalProject;
		if (personalProject && canWriteProjectSkillScope(personalProject.id)) {
			options.push({
				value: `${PROJECT_SCOPE_PREFIX}${personalProject.id}`,
				label: i18n.baseText('settings.context.skills.scope.personalProject'),
				icon: 'user',
			});
		}
		for (const project of projectsStore.myProjects) {
			if (project.type !== 'team' || !canWriteProjectSkillScope(project.id)) continue;
			options.push({
				value: `${PROJECT_SCOPE_PREFIX}${project.id}`,
				label: project.name ?? project.id,
				icon: 'layers',
			});
		}
		return options;
	});

	return { scopeOptions };
}

/** Settings creates and moves skills only to a project or the instance, never to one agent. */
export function parseSkillScope(value: string): {
	scope: 'project' | 'instance';
	projectId?: string;
} {
	if (value.startsWith(PROJECT_SCOPE_PREFIX)) {
		return { scope: 'project', projectId: value.slice(PROJECT_SCOPE_PREFIX.length) };
	}
	return { scope: 'instance' };
}

/** The value of the scope picker for a saved skill. An agent skill has no picker value of its own. */
export function skillScopeValue(skill: Pick<SkillListItem, 'scope' | 'projectId'>): string {
	if (skill.scope === 'project' && skill.projectId)
		return `${PROJECT_SCOPE_PREFIX}${skill.projectId}`;
	return skill.scope;
}

export const SKILLS_LIST_QUERY_STATE = 'skillsListQuery';
export const SAVED_SKILL_STATE = 'savedSkill';

export type SavedSkillNotice = { id: string; created: boolean };

export function readSkillsListQuery(state: unknown): Record<string, string> {
	const query = isRecord(state) ? state[SKILLS_LIST_QUERY_STATE] : undefined;
	if (!isRecord(query)) return {};
	return Object.fromEntries(
		Object.entries(query).filter(
			(entry): entry is [string, string] => typeof entry[1] === 'string',
		),
	);
}

export function readSavedSkillNotice(state: unknown): SavedSkillNotice | undefined {
	const notice = isRecord(state) ? state[SAVED_SKILL_STATE] : undefined;
	if (!isRecord(notice) || typeof notice.id !== 'string') return undefined;
	return { id: notice.id, created: notice.created === true };
}
