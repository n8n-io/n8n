import { Lw as assert, el as clearAllNodeResourceLocatorValues, fC as VIEWS, gy as tryToParseNumber, iy as getNewWorkflow, of as doesNodeHaveCredentialsToFill, rl as replaceAllTemplateNodeCredentials, ug as getNodesWithNormalizedPosition } from "./app-D5flEmb-.js";
//#region src/features/workflows/templates/utils/templateActions.ts
/**
* Creates a new workflow from a template
*/
async function createWorkflowFromTemplate(opts) {
	const { credentialOverrides, nodeTypeProvider, rootStore, template, workflowsStore } = opts;
	const workflowData = await getNewWorkflow(rootStore.restApiContext, { name: template.name });
	let nodesWithOverrides = replaceAllTemplateNodeCredentials(nodeTypeProvider, template.workflow.nodes, credentialOverrides);
	if (opts.clearResourceLocators) nodesWithOverrides = clearAllNodeResourceLocatorValues(nodesWithOverrides);
	const nodes = getNodesWithNormalizedPosition(nodesWithOverrides);
	const connections = template.workflow.connections;
	const workflowToCreate = {
		name: workflowData.name,
		nodes,
		connections,
		active: false,
		meta: { templateId: template.id.toString() },
		pinData: template.readyToDemo ? template.workflow.pinData ?? {} : {}
	};
	return await workflowsStore.createNewWorkflow(workflowToCreate);
}
/**
* Opens the template credential setup view
*/
async function openTemplateCredentialSetup(opts) {
	const { router, templateId, inNewBrowserTab = false, telemetry, source } = opts;
	telemetry.track("User opened cred setup", { source });
	const routeLocation = {
		name: VIEWS.TEMPLATE_SETUP,
		params: { id: templateId }
	};
	if (inNewBrowserTab) {
		const route = router.resolve(routeLocation);
		window.open(route.href, "_blank");
	} else await router.push(routeLocation);
}
/**
* Opens the given template's workflow on NodeView. Fires necessary
* telemetry events.
*/
async function openTemplateWorkflowOnNodeView(opts) {
	const { externalHooks, templateId, templatesStore, inNewBrowserTab, router } = opts;
	const routeLocation = {
		name: VIEWS.TEMPLATE_IMPORT,
		params: { id: templateId }
	};
	const telemetryPayload = {
		source: "workflow",
		template_id: tryToParseNumber(templateId),
		wf_template_repo_session_id: templatesStore.currentSessionId
	};
	await externalHooks.run("templatesWorkflowView.openWorkflow", telemetryPayload);
	if (inNewBrowserTab) {
		const route = router.resolve(routeLocation);
		window.open(route.href, "_blank");
	} else await router.push(routeLocation);
}
function hasTemplateCredentials(nodeTypeProvider, template) {
	return template.workflow.nodes.some((node) => doesNodeHaveCredentialsToFill(nodeTypeProvider, node));
}
async function getFullTemplate(templatesStore, templateId) {
	const template = templatesStore.getFullTemplateById(templateId);
	if (template) return template;
	await templatesStore.fetchTemplateById(templateId);
	return templatesStore.getFullTemplateById(templateId);
}
/**
* Uses the given template by opening the template workflow on NodeView
* or the template credential setup view. Fires necessary telemetry events.
*/
async function useTemplateWorkflow(opts) {
	const { nodeTypesStore, templateId, templatesStore } = opts;
	const [template] = await Promise.all([getFullTemplate(templatesStore, templateId), nodeTypesStore.loadNodeTypesIfNotLoaded()]);
	assert(template);
	if (hasTemplateCredentials(nodeTypesStore, template)) await openTemplateCredentialSetup(opts);
	else await openTemplateWorkflowOnNodeView(opts);
}
//#endregion
export { useTemplateWorkflow as n, createWorkflowFromTemplate as t };
