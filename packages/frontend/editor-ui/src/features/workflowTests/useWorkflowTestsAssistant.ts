import { computed, ref, watch, type Ref } from 'vue';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import {
	ensurePersonalProjectId,
	type InstanceAiThreadLaunch,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import type { InstanceAiEmbedSubject } from '@/features/ai/instanceAi/embed/instanceAiEmbed.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

/** The home project of the workflow when the user is a member of it, else the personal project. */
async function threadProjectId(homeProjectId: string | undefined): Promise<string | null> {
	const projectsStore = useProjectsStore();
	if (homeProjectId) {
		if (projectsStore.myProjects.length === 0) await projectsStore.getMyProjects().catch(() => {});
		if (projectsStore.myProjects.some((project) => project.id === homeProjectId)) {
			return homeProjectId;
		}
	}
	return await ensurePersonalProjectId();
}

/**
 * The subject and launch of the Assistant panel on the Tests tab. The launch
 * context binds the panel's threads to the workflow, so the panel reopens the
 * same conversation (see `threadTargetsSubject`).
 */
export function useWorkflowTestsAssistant(
	workflow: Ref<{ id: string; name: string; homeProjectId?: string }>,
) {
	const available = useInstanceAiAvailable();
	const projectId = ref<string | null>(null);

	watch(
		() => [workflow.value.id, workflow.value.homeProjectId] as const,
		async ([, homeProjectId]) => {
			projectId.value = await threadProjectId(homeProjectId);
		},
		{ immediate: true },
	);

	const subject = computed<InstanceAiEmbedSubject | null>(() =>
		projectId.value
			? {
					type: 'workflow',
					id: workflow.value.id,
					projectId: projectId.value,
					name: workflow.value.name,
				}
			: null,
	);

	const launch = computed<InstanceAiThreadLaunch>(() => ({
		source: 'workflow_tests',
		origin: 'internal',
		sourceContext: { workflowId: workflow.value.id },
	}));

	return { available, subject, launch };
}
