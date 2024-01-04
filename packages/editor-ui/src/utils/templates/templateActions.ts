import type { INodeUi, IWorkflowData, IWorkflowTemplate } from '@/Interface';
import { getNewWorkflow } from '@/api/workflows';
import { TEMPLATE_CREDENTIAL_SETUP_EXPERIMENT, VIEWS } from '@/constants';
import type { useRootStore } from '@/stores/n8nRoot.store';
import type { PosthogStore } from '@/stores/posthog.store';
import type { useWorkflowsStore } from '@/stores/workflows.store';
import { getFixedNodesList } from '@/utils/nodeViewUtils';
import type { NodeTypeProvider } from '@/utils/nodeTypes/nodeTypeTransforms';
import type { TemplateCredentialKey } from '@/utils/templates/templateTransforms';
import { replaceAllTemplateNodeCredentials } from '@/utils/templates/templateTransforms';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import type { RouteLocationRaw, Router } from 'vue-router';

/**
 * Creates a new workflow from a template
 */
export async function createWorkflowFromTemplate(opts: {
	template: IWorkflowTemplate;
	credentialOverrides: Record<TemplateCredentialKey, INodeCredentialsDetails>;
	rootStore: ReturnType<typeof useRootStore>;
	workflowsStore: ReturnType<typeof useWorkflowsStore>;
	nodeTypeProvider: NodeTypeProvider;
}) {
	const { credentialOverrides, nodeTypeProvider, rootStore, template, workflowsStore } = opts;

	const workflowData = await getNewWorkflow(rootStore.getRestApiContext, template.name);
	const nodesWithCreds = replaceAllTemplateNodeCredentials(
		nodeTypeProvider,
		template.workflow.nodes,
		credentialOverrides,
	);
	const nodes = getFixedNodesList(nodesWithCreds) as INodeUi[];
	const connections = template.workflow.connections;

	const workflowToCreate: IWorkflowData = {
		name: workflowData.name,
		nodes,
		connections,
		active: false,
		// Ignored: pinData, settings, tags, versionId, meta
	};

	const createdWorkflow = await workflowsStore.createNewWorkflow(workflowToCreate);

	return createdWorkflow;
}

/**
 * Opens the template credential setup view (or workflow view
 * if the feature flag is disabled)
 */
export async function openTemplateCredentialSetup(opts: {
	posthogStore: PosthogStore;
	templateId: string;
	router: Router;
	inNewBrowserTab?: boolean;
}) {
	const { router, templateId, inNewBrowserTab = false, posthogStore } = opts;

	const routeLocation: RouteLocationRaw = posthogStore.isFeatureEnabled(
		TEMPLATE_CREDENTIAL_SETUP_EXPERIMENT,
	)
		? {
				name: VIEWS.TEMPLATE_SETUP,
				params: { id: templateId },
		  }
		: {
				name: VIEWS.TEMPLATE_IMPORT,
				params: { id: templateId },
		  };

	if (inNewBrowserTab) {
		const route = router.resolve(routeLocation);
		window.open(route.href, '_blank');
	} else {
		await router.push(routeLocation);
	}
}
