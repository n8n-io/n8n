import type {
	PublishJudgeAssistantHandoff,
	PublishJudgeAssistantOutcome,
} from '@n8n/frontend-module-sdk';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useInstanceAiReady } from './useInstanceAiAvailability';
import { useInstanceAiHandoff } from './useInstanceAiHandoff';

export function usePublishJudgeAssistantHandoff(): PublishJudgeAssistantHandoff {
	const available = useInstanceAiReady();
	const { startThread } = useInstanceAiHandoff();
	const projectsStore = useProjectsStore();

	async function start(request: string, projectId?: string): Promise<PublishJudgeAssistantOutcome> {
		// A judge can live in any project, so an instance judge is built in the personal project.
		const chatProjectId = projectId ?? projectsStore.personalProject?.id;
		if (!available.value || !chatProjectId) return 'unavailable';

		const outcome = await startThread(
			chatProjectId,
			request,
			{ kind: 'prefill', prefillType: 'handoff_publish_judge' },
			{ source: 'publish_judge_settings', origin: 'internal' },
		);

		return outcome === 'setup' ? 'unavailable' : outcome;
	}

	return { available, start };
}
