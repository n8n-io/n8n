import type { AiPreferenceScope } from '@n8n/api-types';
import type { useI18n } from '@n8n/i18n';

import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

type I18n = ReturnType<typeof useI18n>;

/**
 * The words the card and its modal use for a scope. A personal project is named by its
 * kind, because its stored name is an email string. A project the store does not list
 * gets a neutral label rather than its id.
 */
export function preferenceScopeLabel(
	i18n: I18n,
	scope: AiPreferenceScope,
	projectId: string | null,
	myProjects: ProjectListItem[],
): string {
	if (scope === 'user') return i18n.baseText('settings.context.preferences.scope.user');
	if (scope === 'instance') return i18n.baseText('settings.context.preferences.scope.instance');

	const project = myProjects.find((candidate) => candidate.id === projectId);
	if (!project) return i18n.baseText('instanceAi.preferenceCard.scope.projectFallback');
	if (project.type === 'personal') {
		return i18n.baseText('settings.context.preferences.scope.personalProject');
	}
	return i18n.baseText('instanceAi.preferenceCard.scope.project', {
		interpolate: { name: project.name ?? project.id },
	});
}
