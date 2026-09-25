import type { AiPreferenceScope } from '@n8n/api-types';
import type { useI18n } from '@n8n/i18n';

import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

type I18n = ReturnType<typeof useI18n>;

/**
 * The words the card and its modal use for a scope. A personal project is named by its
 * kind, because its stored name is an email string. A project the store does not list
 * gets a neutral label rather than its id.
 *
 * Only the thread's own project is "this project". A row can sit in another one, and the
 * select can offer both at once, so naming them both "this project" would describe two
 * different places with the same words.
 */
export function preferenceScopeLabel(
	i18n: I18n,
	scope: AiPreferenceScope,
	projectId: string | null,
	myProjects: ProjectListItem[],
	threadProjectId: string | null = null,
): string {
	if (scope === 'user') return i18n.baseText('settings.context.preferences.scope.user');
	if (scope === 'instance') return i18n.baseText('settings.context.preferences.scope.instance');

	const isThreadProject = projectId !== null && projectId === threadProjectId;
	const project = myProjects.find((candidate) => candidate.id === projectId);
	if (!project) {
		return i18n.baseText(
			isThreadProject
				? 'instanceAi.preferenceCard.scope.projectFallback'
				: 'instanceAi.preferenceCard.scope.otherProjectFallback',
		);
	}
	if (project.type === 'personal') {
		return i18n.baseText('settings.context.preferences.scope.personalProject');
	}
	return i18n.baseText(
		isThreadProject
			? 'instanceAi.preferenceCard.scope.project'
			: 'instanceAi.preferenceCard.scope.otherProject',
		{ interpolate: { name: project.name ?? project.id } },
	);
}
