import { useI18n } from '@n8n/i18n';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
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
 * Opens n8n Assistant in a new tab on the tests of one workflow. The server
 * loads the `workflow-tests` skill for the first turn.
 */
export function useGenerateWorkflowTests() {
	const available = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();
	const i18n = useI18n();

	async function open(workflow: { id: string; name: string; homeProjectId?: string }) {
		const projectId = await threadProjectId(workflow.homeProjectId);
		if (!projectId) return 'failed';
		return await startThread(
			projectId,
			i18n.baseText('workflowTests.generate.prompt'),
			{ kind: 'prefill', prefillType: 'handoff_workflow_tests' },
			{ source: 'workflow_tests', origin: 'internal', sourceContext: { workflowId: workflow.id } },
			[{ type: 'workflow', id: workflow.id, name: workflow.name }],
			undefined,
			{ newTab: true, context: { source: 'workflow-tests', workflowId: workflow.id } },
		);
	}

	return { available, open };
}
