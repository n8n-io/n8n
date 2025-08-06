import type { INodeUi } from '@/Interface';
import type { ITemplatesWorkflowFull, IWorkflowTemplate } from '@n8n/rest-api-client/api/templates';
import type { WorkflowData } from '@n8n/rest-api-client/api/workflows';
import { getNewWorkflow } from '@/api/workflows';
import { VIEWS } from '@/constants';
import type { useRootStore } from '@n8n/stores/useRootStore';
import type { useWorkflowsStore } from '@/stores/workflows.store';
import { getNodesWithNormalizedPosition } from '@/utils/nodeViewUtils';
import type { NodeTypeProvider } from '@/utils/nodeTypes/nodeTypeTransforms';
import type { TemplateCredentialKey } from '@/utils/templates/templateTransforms';
import { replaceAllTemplateNodeCredentials } from '@/utils/templates/templateTransforms';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import type { RouteLocationRaw, Router } from 'vue-router';
import type { TemplatesStore } from '@/stores/templates.store';
import type { NodeTypesStore } from '@/stores/nodeTypes.store';
import type { Telemetry } from '@/plugins/telemetry';
import type { useExternalHooks } from '@/composables/useExternalHooks';
import { assert } from '@n8n/utils/assert';
import { doesNodeHaveCredentialsToFill } from '@/utils/nodes/nodeTransforms';
import { tryToParseNumber } from '@/utils/typesUtils';

type ExternalHooks = ReturnType<typeof useExternalHooks>;

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

	const workflowData = await getNewWorkflow(rootStore.restApiContext, { name: template.name });
	const nodesWithCreds = replaceAllTemplateNodeCredentials(
		nodeTypeProvider,
		template.workflow.nodes,
		credentialOverrides,
	);
	const nodes = getNodesWithNormalizedPosition(nodesWithCreds) as INodeUi[];
	const connections = template.workflow.connections;

	const workflowToCreate: WorkflowData = {
		name: workflowData.name,
		nodes,
		connections,
		active: false,
		meta: {
			templateId: template.id.toString(),
		},
		// Ignored: pinData, settings, tags, versionId
	};

	const createdWorkflow = await workflowsStore.createNewWorkflow(workflowToCreate);

	return createdWorkflow;
}

/**
 * Opens the template credential setup view
 */
async function openTemplateCredentialSetup(opts: {
	templateId: string;
	router: Router;
	inNewBrowserTab?: boolean;
	telemetry: Telemetry;
	source: string;
}) {
	const { router, templateId, inNewBrowserTab = false, telemetry, source } = opts;

	telemetry.track('User opened cred setup', { source });

	const routeLocation: RouteLocationRaw = {
		name: VIEWS.TEMPLATE_SETUP,
		params: { id: templateId },
	};

	if (inNewBrowserTab) {
		const route = router.resolve(routeLocation);
		window.open(route.href, '_blank');
	} else {
		await router.push(routeLocation);
	}
}

/**
 * Opens the given template's workflow on NodeView. Fires necessary
 * telemetry events.
 */
async function openTemplateWorkflowOnNodeView(opts: {
	externalHooks: ExternalHooks;
	templateId: string;
	templatesStore: TemplatesStore;
	router: Router;
	inNewBrowserTab?: boolean;
}) {
	const { externalHooks, templateId, templatesStore, inNewBrowserTab, router } = opts;
	const routeLocation: RouteLocationRaw = {
		name: VIEWS.TEMPLATE_IMPORT,
		params: { id: templateId },
	};
	const telemetryPayload = {
		source: 'workflow',
		template_id: tryToParseNumber(templateId),
		wf_template_repo_session_id: templatesStore.currentSessionId,
	};

	await externalHooks.run('templatesWorkflowView.openWorkflow', telemetryPayload);

	if (inNewBrowserTab) {
		const route = router.resolve(routeLocation);
		window.open(route.href, '_blank');
	} else {
		await router.push(routeLocation);
	}
}

function hasTemplateCredentials(
	nodeTypeProvider: NodeTypeProvider,
	template: ITemplatesWorkflowFull,
) {
	return template.workflow.nodes.some((node) =>
		doesNodeHaveCredentialsToFill(nodeTypeProvider, node),
	);
}

async function getFullTemplate(templatesStore: TemplatesStore, templateId: string) {
	const template = templatesStore.getFullTemplateById(templateId);
	if (template) {
		return template;
	}

	await templatesStore.fetchTemplateById(templateId);
	return templatesStore.getFullTemplateById(templateId);
}

/**
 * Uses the given template by opening the template workflow on NodeView
 * or the template credential setup view. Fires necessary telemetry events.
 */
export async function useTemplateWorkflow(opts: {
	externalHooks: ExternalHooks;
	nodeTypesStore: NodeTypesStore;
	templateId: string;
	templatesStore: TemplatesStore;
	router: Router;
	inNewBrowserTab?: boolean;
	telemetry: Telemetry;
	source: string;
}) {
	const { nodeTypesStore, templateId, templatesStore } = opts;

	const [template] = await Promise.all([
		getFullTemplate(templatesStore, templateId),
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
	]);
	assert(template);

	if (hasTemplateCredentials(nodeTypesStore, template)) {
		await openTemplateCredentialSetup(opts);
	} else {
		await openTemplateWorkflowOnNodeView(opts);
	}
}
