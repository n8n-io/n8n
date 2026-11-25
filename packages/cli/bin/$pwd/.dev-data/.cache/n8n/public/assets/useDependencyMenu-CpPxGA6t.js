import { Xo as useRouter } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, Pu as DATA_TABLE_DETAILS, fC as VIEWS, jN as useI18n, kh as AGENT_BUILDER_VIEW } from "./app-D5flEmb-.js";
//#region src/app/composables/useDependencyMenu.ts
var typeConfig = {
	credentialId: {
		icon: "key-round",
		labelKey: "workflows.dependencies.type.credentials"
	},
	dataTableId: {
		icon: "table",
		labelKey: "workflows.dependencies.type.dataTables"
	},
	agentUsage: {
		icon: "bot",
		labelKey: "workflows.dependencies.type.agents"
	},
	errorWorkflow: {
		icon: "bug",
		labelKey: "workflows.dependencies.type.errorWorkflow"
	},
	errorWorkflowParent: {
		icon: "bug",
		labelKey: "workflows.dependencies.type.errorWorkflowParent"
	},
	workflowCall: {
		icon: "log-in",
		labelKey: "workflows.dependencies.type.subWorkflows"
	},
	workflowParent: {
		icon: "log-in",
		labelKey: "workflows.dependencies.type.parentWorkflows"
	}
};
var displayOrder = [
	"credentialId",
	"dataTableId",
	"workflowCall",
	"workflowParent",
	"agentUsage",
	"errorWorkflow",
	"errorWorkflowParent"
];
/** Shared building blocks for dependency dropdowns (dependency pill, workflow menu). */
function useDependencyMenu() {
	const i18n = useI18n();
	const router = useRouter();
	const uiStore = useUIStore();
	/** Menu items grouped by type, with a disabled header per group. Item ids are `<type>:<id>`. */
	function buildDependencyMenuItems(deps, query = "") {
		if (deps.length === 0) return [];
		const normalizedQuery = query.toLowerCase().trim();
		const filtered = normalizedQuery ? deps.filter((dep) => dep.name.toLowerCase().includes(normalizedQuery)) : deps;
		const groups = {
			credentialId: [],
			dataTableId: [],
			agentUsage: [],
			errorWorkflow: [],
			errorWorkflowParent: [],
			workflowCall: [],
			workflowParent: []
		};
		const unavailable = filtered.filter((dep) => dep.unavailable);
		for (const dep of filtered) if (!dep.unavailable) groups[dep.type].push(dep);
		const items = [];
		for (const typeKey of displayOrder) {
			const groupDeps = groups[typeKey];
			if (groupDeps.length === 0) continue;
			const config = typeConfig[typeKey];
			items.push({
				id: `header-${typeKey}`,
				label: i18n.baseText(config.labelKey),
				icon: {
					type: "icon",
					value: config.icon
				},
				disabled: true,
				divided: items.length > 0
			});
			for (const dep of groupDeps) items.push({
				id: `${dep.type}:${dep.id}`,
				label: dep.name
			});
		}
		if (unavailable.length > 0) {
			items.push({
				id: "header-unavailable",
				label: i18n.baseText("workflows.dependencies.unavailable.header"),
				icon: {
					type: "icon",
					value: "user-lock"
				},
				disabled: true,
				divided: items.length > 0
			});
			for (const dep of unavailable) items.push({
				id: `${dep.type}:${dep.id}`,
				label: dep.name,
				disabled: true
			});
		}
		return items;
	}
	/** The dependency a menu item id (`<type>:<id>`) points to, or undefined. */
	function resolveDependencyMenuId(deps, value) {
		const [type, id] = value.split(":");
		if (!type || !id) return void 0;
		return deps.find((dep) => dep.type === type && dep.id === id && !dep.unavailable);
	}
	/** Open the resource behind a dependency (credential modal, or a new tab). */
	function openDependency(dep) {
		if (dep.unavailable) return;
		switch (dep.type) {
			case "credentialId":
				uiStore.openExistingCredential(dep.id);
				break;
			case "workflowCall":
			case "workflowParent":
			case "errorWorkflow":
			case "errorWorkflowParent": {
				const href = router.resolve({
					name: VIEWS.WORKFLOW,
					params: { workflowId: dep.id }
				}).href;
				window.open(href, "_blank");
				break;
			}
			case "dataTableId":
				if (dep.projectId) {
					const href = router.resolve({
						name: DATA_TABLE_DETAILS,
						params: {
							projectId: dep.projectId,
							id: dep.id
						}
					}).href;
					window.open(href, "_blank");
				}
				break;
			case "agentUsage": if (dep.projectId) {
				const href = router.resolve({
					name: AGENT_BUILDER_VIEW,
					params: {
						projectId: dep.projectId,
						agentId: dep.id
					}
				}).href;
				window.open(href, "_blank");
			}
		}
	}
	return {
		buildDependencyMenuItems,
		resolveDependencyMenuId,
		openDependency
	};
}
//#endregion
export { useDependencyMenu as t };
