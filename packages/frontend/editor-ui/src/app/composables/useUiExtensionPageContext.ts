import type { UiExtensionPageContext } from '@n8n/api-types';
import { computed, type ShallowRef } from 'vue';
import { useRoute } from 'vue-router';

import { VIEWS } from '@/app/constants';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { isServiceNodeType } from '@/app/utils/uiExtensionNodes';

/** Routes that show one workflow on the canvas. */
const WORKFLOW_ROUTES = new Set<string>([
	VIEWS.WORKFLOW,
	VIEWS.NEW_WORKFLOW,
	VIEWS.EXECUTION_DEBUG,
	VIEWS.TEMPLATE_IMPORT,
]);

/** Routes that list workflows. */
const WORKFLOWS_ROUTES = new Set<string>([
	VIEWS.WORKFLOWS,
	VIEWS.PROJECTS_WORKFLOWS,
	VIEWS.SHARED_WORKFLOWS,
	VIEWS.FOLDERS,
	VIEWS.PROJECTS_FOLDERS,
]);

/** `DEFAULT` and an empty value mean that the workflow has no error workflow. */
function hasErrorWorkflow(errorWorkflow: string | undefined): boolean {
	return !!errorWorkflow && errorWorkflow !== 'DEFAULT';
}

/**
 * The page context that side panel views get: which page is open and what is on
 * it. This is the full context. The side panel removes what a view may not see.
 */
export function useUiExtensionPageContext(
	workflowDocumentStore: Readonly<ShallowRef<WorkflowDocumentStore | null>>,
) {
	const route = useRoute();
	const workflowsListStore = useWorkflowsListStore();
	const nodeTypesStore = useNodeTypesStore();

	const routeName = computed(() => (typeof route.name === 'string' ? route.name : null));

	const pageContext = computed<UiExtensionPageContext>(() => {
		const name = routeName.value;

		if (name && WORKFLOW_ROUTES.has(name)) {
			const store = workflowDocumentStore.value;
			return {
				page: 'workflow',
				routeName: name,
				workflow: store
					? {
							id: store.workflowId,
							name: store.name,
							active: store.active,
							nodes: store.allNodes.map((node) => {
								const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
								return {
									name: node.name,
									type: node.type,
									...(nodeType && {
										displayName: nodeType.displayName,
										defaultName: nodeType.defaults.name ?? nodeType.displayName,
										isTrigger: nodeType.group.includes('trigger'),
										isService: isServiceNodeType(nodeType),
									}),
									disabled: node.disabled === true,
								};
							}),
							hasErrorWorkflow: hasErrorWorkflow(store.settings?.errorWorkflow),
						}
					: null,
			};
		}

		if (name && WORKFLOWS_ROUTES.has(name)) {
			const projectId = route.params.projectId;
			return {
				page: 'workflows',
				routeName: name,
				projectId: typeof projectId === 'string' ? projectId : null,
				totalWorkflows: workflowsListStore.totalWorkflowCount,
			};
		}

		return { page: 'other', routeName: name };
	});

	const workflowAvailableInMcp = computed(
		() => workflowDocumentStore.value?.settings?.availableInMCP === true,
	);

	return { pageContext, workflowAvailableInMcp };
}
