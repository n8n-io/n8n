import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiThreadOrigin, InstanceAiThreadSource } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useInstanceAiStore } from './instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from './constants';

export interface InstanceAiLaunchOptions {
	message: string;
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
	autoSend?: boolean;
	/** Defaults to the user's personal project. */
	projectId?: string;
}

/**
 * Single chokepoint for provisioning a new Instance AI thread. External
 * launches can never auto-send; that rule lives here so it can't be bypassed.
 * Does not navigate, and is safe outside component setup (e.g. router guards).
 */
export async function prepareInstanceAiLaunch(options: InstanceAiLaunchOptions): Promise<string> {
	const store = useInstanceAiStore();
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();
	const telemetry = useTelemetry();

	// Threads are project-bound. Default to the personal project, fetching it if
	// the store hasn't loaded yet (e.g. when called from a route guard).
	if (!options.projectId && !projectsStore.personalProject) {
		await projectsStore.getPersonalProject();
	}
	const projectId = options.projectId ?? projectsStore.personalProject?.id;
	if (!projectId) {
		throw new Error('Cannot launch an Instance AI thread without a project');
	}

	const threadId = uuidv4();
	const autoSend = options.origin === 'external' ? false : (options.autoSend ?? false);

	await store.syncThread(threadId, projectId, {
		source: options.source,
		origin: options.origin,
		sourceContext: options.sourceContext,
	});

	telemetry.track('User launched Instance AI thread', {
		thread_id: threadId,
		instance_id: rootStore.instanceId,
		source: options.source,
		origin: options.origin,
		auto_send: autoSend,
	});

	store.setPendingLaunch(threadId, options.message, autoSend);

	return threadId;
}

export function useInstanceAiLauncher() {
	const router = useRouter();

	async function launch(options: InstanceAiLaunchOptions): Promise<string> {
		const threadId = await prepareInstanceAiLaunch(options);
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
		return threadId;
	}

	return { launch };
}
