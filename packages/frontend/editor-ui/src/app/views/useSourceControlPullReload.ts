import { onBeforeUnmount, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { IWorkflowDb } from '@/Interface';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { CredentialFetchScope } from '@/features/credentials/credentials.types';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import { useTagsStore } from '@/features/shared/tags/tags.store';

/** The view passes these in, because they belong to the view's canvas instance. */
export type SourceControlPullReloadOptions = Pick<
	ReturnType<typeof useCanvasOperations>,
	'initializeWorkspace' | 'fitView'
>;

/** Refreshes the open canvas after a source control pull. */
export function useSourceControlPullReload({
	initializeWorkspace,
	fitView,
}: SourceControlPullReloadOptions) {
	const route = useRoute();
	const workflowId = useInjectWorkflowId();
	const documentTitle = useDocumentTitle();
	const externalHooks = useExternalHooks();

	const uiStore = useUIStore();
	const workflowsListStore = useWorkflowsListStore();
	const builderStore = useBuilderStore();
	const projectsStore = useProjectsStore();
	const credentialsStore = useCredentialsStore();
	const environmentsStore = useEnvironmentsStore();
	const tagsStore = useTagsStore();

	async function loadCredentials() {
		let options: CredentialFetchScope;

		if (workflowId.value && route.query.new !== 'true') {
			options = { workflowId: workflowId.value };
		} else {
			const queryParam =
				typeof route.query?.projectId === 'string' ? route.query?.projectId : undefined;
			const projectId = queryParam ?? projectsStore.personalProject?.id;
			if (projectId === undefined) {
				throw new Error(
					'Could not find projectId in the query nor could I find the personal project in the project store',
				);
			}

			options = { projectId };
		}

		await credentialsStore.fetchUsableCredentials(options);
	}

	/**
	 * Do not reset the workspace here. A reset empties the node list, and the canvas then shows
	 * the empty canvas placeholder and fails to render the nodes that come back.
	 */
	async function reloadWorkflowInPlace(data: IWorkflowDb) {
		documentTitle.setDocumentTitle(data.name, builderStore.streaming ? 'AI_BUILDING' : 'IDLE');

		await initializeWorkspace(data);

		void externalHooks.run('workflow.open', {
			workflowId: data.id,
			workflowName: data.name,
		});

		fitView();
	}

	async function onSourceControlPull() {
		try {
			await Promise.all([
				environmentsStore.fetchAllVariables(),
				tagsStore.fetchAll(),
				loadCredentials(),
				projectsStore.getAvailableProjects(),
			]);

			if (workflowId.value && !uiStore.stateIsDirty) {
				const workflowData = await workflowsListStore.fetchWorkflow(workflowId.value);
				if (workflowData) {
					await reloadWorkflowInPlace(workflowData);
				}
			}
		} catch (error) {
			console.error(error);
		}
	}

	onMounted(() => sourceControlEventBus.on('pull', onSourceControlPull));
	onBeforeUnmount(() => sourceControlEventBus.off('pull', onSourceControlPull));
}
