import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/**
 * Resolves the project an agent belongs to, with a single source of truth:
 * an explicit override (e.g. a `projectId` prop) → the route param →
 * the user's personal project → empty string.
 *
 * Centralising this avoids each component re-deriving the project id with
 * subtly different fallbacks (which previously caused project-scoped views to
 * fall back to personal-project data).
 */
export function useAgentProjectId(
	override?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string> {
	const route = useRoute();
	const projectsStore = useProjectsStore();

	return computed(
		() =>
			toValue(override) ??
			(route.params.projectId as string | undefined) ??
			projectsStore.personalProject?.id ??
			'',
	);
}
