import { Fw as makeRestApiRequest, Pw as makePublicApiRequest } from "./app-D5flEmb-.js";
//#region ../../modules/promotions/frontend/src/promotions.api.ts
async function getPromotionPreview(context, projectId, direction) {
	return await makePublicApiRequest(context, "GET", `/promotions/projects/${projectId}/changes/${direction}`);
}
async function getPromotionResourceDetails(context, projectId, direction, payload) {
	return await makePublicApiRequest(context, "POST", `/promotions/projects/${projectId}/changes/${direction}/details`, payload);
}
/** The preview of a whole-instance Apply from an instance Apply environment. */
async function getPromotionEnvironmentChanges(context, environmentId) {
	return await makePublicApiRequest(context, "GET", `/promotions/environments/${environmentId}/changes`);
}
async function getPromotionEnvironmentDetails(context, environmentId, payload) {
	return await makePublicApiRequest(context, "POST", `/promotions/environments/${environmentId}/changes/details`, payload);
}
async function getPromotionReviewChanges(context, reviewId) {
	return await makeRestApiRequest(context, "GET", `/promotions/reviews/${reviewId}/changes`);
}
async function getPromotionReviewDetails(context, reviewId, payload) {
	return await makeRestApiRequest(context, "POST", `/promotions/reviews/${reviewId}/changes/details`, payload);
}
async function promoteProjectSelection(context, projectId, payload) {
	return await makePublicApiRequest(context, "POST", `/promotions/projects/${projectId}/promote`, payload);
}
/** Applies only the chosen workflows into the destination project. */
async function applyProjectSelection(context, projectId, payload) {
	return await makePublicApiRequest(context, "POST", `/promotions/projects/${projectId}/apply`, payload);
}
/** Resumes a selective apply that paused on unresolved bindings, once they are created. */
async function continueApplyProjectSelection(context, projectId, payload) {
	return await makePublicApiRequest(context, "POST", `/promotions/projects/${projectId}/apply/continue`, payload);
}
//#endregion
//#region ../../modules/promotions/frontend/src/promotionPreview.tree.ts
/**
* Sub-workflows come first, next to the workflows. The others follow the project tabs:
* credentials, variables, data tables. Tags come last.
*/
var GROUP_ORDER = [
	"subWorkflow",
	"credential",
	"variable",
	"dataTable",
	"tag"
];
var RESOURCE_ICONS = {
	project: "layers",
	folder: "folder",
	workflow: "workflow",
	credential: "key-round",
	dataTable: "table",
	variable: "variable",
	tag: "tags"
};
function resourceIcon(type) {
	return RESOURCE_ICONS[type];
}
/** Projects and folders hold other resources. */
var isContainer = (resource) => resource.type === "project" || resource.type === "folder";
/** Projects and folders without a change only give structure. They get no change card. */
function hasCard(resource) {
	return !isContainer(resource) || resource.change !== "unchanged";
}
/** The dependency group of a resource, or `null` when it belongs to the project hierarchy. */
function groupOf(resource) {
	switch (resource.type) {
		case "project":
		case "folder": return null;
		case "workflow": return resource.parentKey === null ? "subWorkflow" : null;
		default: return resource.type;
	}
}
function byFolderThenName(a, b) {
	return Number(b.type === "folder") - Number(a.type === "folder") || a.name.localeCompare(b.name) || a.key.localeCompare(b.key);
}
function toItem(resource, children) {
	return {
		id: resource.key,
		label: resource.name,
		icon: resourceIcon(resource.type),
		kind: "resource",
		...children && children.length > 0 ? { children } : {}
	};
}
function hierarchyItems(resources) {
	const keys = new Set(resources.map((resource) => resource.key));
	const childrenOf = /* @__PURE__ */ new Map();
	for (const resource of resources) {
		const parentKey = resource.parentKey !== null && keys.has(resource.parentKey) ? resource.parentKey : null;
		const siblings = childrenOf.get(parentKey) ?? [];
		siblings.push(resource);
		childrenOf.set(parentKey, siblings);
	}
	const build = (parentKey) => (childrenOf.get(parentKey) ?? []).sort(byFolderThenName).map((resource) => toItem(resource, build(resource.key)));
	return build(null);
}
function buildPreviewTree(preview, labels) {
	const hierarchy = [];
	const groups = /* @__PURE__ */ new Map();
	for (const resource of preview.resources) {
		const group = groupOf(resource);
		if (group === null) hierarchy.push(resource);
		else {
			const members = groups.get(group) ?? [];
			members.push(resource);
			groups.set(group, members);
		}
	}
	const sections = [];
	const workflows = hierarchyItems(hierarchy);
	if (workflows.length > 0) sections.push({
		id: "section:workflows",
		label: labels.workflows,
		kind: "section",
		children: workflows
	});
	for (const group of GROUP_ORDER) {
		const members = groups.get(group);
		if (!members) continue;
		sections.push({
			id: `group:${group}`,
			label: labels.group(group),
			kind: "section",
			children: [...members].sort(byFolderThenName).map((resource) => toItem(resource))
		});
	}
	return sections;
}
/** The order of the change cards. It follows the tree, so the tree and the cards agree. */
function cardOrder(items, resources) {
	return flattenPreviewTree(items).map(({ item }) => item).filter((item) => {
		const resource = resources.get(item.id);
		return item.kind === "resource" && resource !== void 0 && hasCard(resource);
	}).map((item) => item.id);
}
/** The rows of the tree, top to bottom. */
function flattenPreviewTree(items, indent = 0) {
	return items.flatMap((item) => [{
		item,
		indent
	}, ...item.children ? flattenPreviewTree(item.children, item.kind === "resource" ? indent + 1 : indent) : []]);
}
//#endregion
//#region ../../modules/promotions/frontend/src/promotionPreview.selection.ts
var initialSelectionState = {
	mode: "default",
	selected: /* @__PURE__ */ new Set()
};
var noKeys = /* @__PURE__ */ new Set();
function addTo(map, key, value) {
	const list = map.get(key);
	if (!list) map.set(key, [value]);
	else if (!list.includes(value)) list.push(value);
}
function buildSelectionGraph(preview, direction) {
	const resources = new Map(preview.resources.map((resource) => [resource.key, resource]));
	const requires = /* @__PURE__ */ new Map();
	const requiredBy = /* @__PURE__ */ new Map();
	const calls = /* @__PURE__ */ new Map();
	const calledBy = /* @__PURE__ */ new Map();
	for (const { workflowKey, resourceKey, included } of preview.dependencies) {
		if (!resources.has(workflowKey) || !resources.has(resourceKey)) continue;
		if (included) {
			addTo(requires, workflowKey, resourceKey);
			addTo(requiredBy, resourceKey, workflowKey);
		} else {
			addTo(calls, workflowKey, resourceKey);
			addTo(calledBy, resourceKey, workflowKey);
		}
	}
	return {
		direction,
		resources,
		requires,
		requiredBy,
		calls,
		calledBy
	};
}
function canSelect(graph, key) {
	return graph.resources.get(key)?.selectable === true;
}
function selectableKeys(graph) {
	return [...graph.resources.values()].filter((resource) => resource.selectable).map((resource) => resource.key);
}
/** The selectable resources that users can add now. */
function availableKeys(graph, disabled = noKeys) {
	return selectableKeys(graph).filter((key) => !disabled.has(key));
}
/** Projects and folders above the resource, nearest first. */
function ancestorsOf(graph, key) {
	const ancestors = [];
	const seen = /* @__PURE__ */ new Set([key]);
	let parentKey = graph.resources.get(key)?.parentKey ?? null;
	while (parentKey !== null && !seen.has(parentKey) && graph.resources.has(parentKey)) {
		ancestors.push(parentKey);
		seen.add(parentKey);
		parentKey = graph.resources.get(parentKey)?.parentKey ?? null;
	}
	return ancestors;
}
/** Resources that `key` needs, directly or through other required resources. */
function requiredClosure(graph, key) {
	const reached = [];
	const seen = /* @__PURE__ */ new Set([key]);
	const queue = [key];
	for (let index = 0; index < queue.length; index++) for (const next of graph.requires.get(queue[index]) ?? []) {
		if (seen.has(next)) continue;
		seen.add(next);
		reached.push(next);
		queue.push(next);
	}
	return reached;
}
function resolveInclusion(graph, selected) {
	const reasons = /* @__PURE__ */ new Map();
	const required = /* @__PURE__ */ new Map();
	const containers = /* @__PURE__ */ new Map();
	const called = /* @__PURE__ */ new Map();
	for (const key of selected) {
		if (!graph.resources.has(key)) continue;
		reasons.set(key, { kind: "selected" });
		for (const dependency of requiredClosure(graph, key)) addTo(required, dependency, key);
		for (const ancestor of ancestorsOf(graph, key)) if (graph.resources.get(ancestor)?.change !== "unchanged") addTo(containers, ancestor, key);
		for (const reference of graph.calls.get(key) ?? []) addTo(called, reference, key);
	}
	for (const [key, by] of required) if (!reasons.has(key)) reasons.set(key, {
		kind: "required",
		by
	});
	for (const [key, by] of containers) if (!reasons.has(key)) reasons.set(key, {
		kind: "container",
		by
	});
	for (const [key, by] of called) if (!reasons.has(key)) reasons.set(key, {
		kind: "calledOnly",
		by
	});
	return {
		included: new Set([...reasons].filter(([, reason]) => reason.kind !== "calledOnly").map(([key]) => key)),
		reasons
	};
}
/** Included resources that the operation changes. */
function includedChangeCount(graph, { included }) {
	return [...included].filter((key) => graph.resources.get(key)?.change !== "unchanged").length;
}
/** The included changes when every selectable resource is selected. */
function totalChangeCount(graph) {
	return includedChangeCount(graph, resolveInclusion(graph, new Set(selectableKeys(graph))));
}
function toggleSelection(state, graph, key, disabled = noKeys) {
	if (!canSelect(graph, key)) return state;
	const selected = new Set(state.selected);
	if (selected.has(key)) selected.delete(key);
	else if (disabled.has(key)) return state;
	else selected.add(key);
	return {
		mode: "custom",
		selected
	};
}
/** The selectable resources inside a project or folder, at any depth. */
function selectableDescendants(graph, containerKey) {
	return selectableKeys(graph).filter((key) => ancestorsOf(graph, key).includes(containerKey));
}
/** What the checkbox of a project or folder selects: the container itself and everything in it. */
function containerKeys(graph, containerKey) {
	const descendants = selectableDescendants(graph, containerKey);
	return canSelect(graph, containerKey) ? [containerKey, ...descendants] : descendants;
}
/**
* A project or folder shows the state of itself and the selectable resources inside it. A
* disabled resource counts only while it is selected, because users cannot add it.
*/
function containerCheckState(graph, selected, containerKey, disabled = noKeys) {
	const keys = containerKeys(graph, containerKey).filter((key) => !disabled.has(key) || selected.has(key));
	const count = keys.filter((key) => selected.has(key)).length;
	if (count === 0) return "unchecked";
	return count === keys.length ? "checked" : "indeterminate";
}
/**
* The checkbox of a resource in the tree and on its change card. Workflows toggle themselves,
* projects and folders toggle themselves and everything inside them, and dependencies stay
* read-only: they are checked while a selected workflow needs them.
*/
function selectionCheck(graph, resource, state) {
	const { selected, inclusion, disabled, locked } = state;
	if (isContainer(resource)) {
		const check = containerCheckState(graph, selected, resource.key, disabled);
		const canAdd = containerKeys(graph, resource.key).some((key) => !disabled.has(key));
		return {
			checked: check === "checked",
			indeterminate: check === "indeterminate",
			disabled: locked || !canAdd && check === "unchecked"
		};
	}
	if (resource.selectable) {
		const checked = selected.has(resource.key);
		return {
			checked,
			indeterminate: false,
			disabled: locked || !checked && disabled.has(resource.key)
		};
	}
	return {
		checked: inclusion.included.has(resource.key),
		indeterminate: false,
		disabled: true
	};
}
/**
* Selects a project or folder and every resource inside it that users can add, or clears them
* all when those are selected.
*/
function toggleContainer(state, graph, containerKey, disabled = noKeys) {
	const keys = containerKeys(graph, containerKey);
	const available = keys.filter((key) => !disabled.has(key));
	const selected = new Set(state.selected);
	if (available.every((key) => selected.has(key))) for (const key of keys) selected.delete(key);
	else for (const key of available) selected.add(key);
	return {
		mode: "custom",
		selected
	};
}
/** Adds every resource that users can add. Selected disabled resources stay selected. */
function selectAll(state, graph, disabled = noKeys) {
	const kept = [...state.selected].filter((key) => canSelect(graph, key));
	return {
		mode: "custom",
		selected: /* @__PURE__ */ new Set([...kept, ...availableKeys(graph, disabled)])
	};
}
function clearSelection() {
	return {
		mode: "custom",
		selected: /* @__PURE__ */ new Set()
	};
}
/**
* Applies a newly loaded preview. A default selection follows the preview: it holds every
* resource that users can add, and keeps a selected resource that became disabled, so the page
* never removes a selected workflow on its own. A custom selection keeps the keys that are still
* selectable and reports the others.
*/
function applyPreview(state, graph, disabled = noKeys) {
	if (state.mode === "default") {
		const selected = selectableKeys(graph).filter((key) => !disabled.has(key) || state.selected.has(key));
		return {
			state: {
				mode: "default",
				selected: new Set(selected)
			},
			dropped: []
		};
	}
	const kept = [...state.selected].filter((key) => canSelect(graph, key));
	const dropped = [...state.selected].filter((key) => !canSelect(graph, key));
	return {
		state: {
			mode: "custom",
			selected: new Set(kept)
		},
		dropped
	};
}
//#endregion
export { getPromotionPreview as C, promoteProjectSelection as D, getPromotionReviewDetails as E, getPromotionEnvironmentDetails as S, getPromotionReviewChanges as T, isContainer as _, includedChangeCount as a, continueApplyProjectSelection as b, selectAll as c, toggleContainer as d, toggleSelection as f, flattenPreviewTree as g, cardOrder as h, clearSelection as i, selectableKeys as l, buildPreviewTree as m, availableKeys as n, initialSelectionState as o, totalChangeCount as p, buildSelectionGraph as r, resolveInclusion as s, applyPreview as t, selectionCheck as u, resourceIcon as v, getPromotionResourceDetails as w, getPromotionEnvironmentChanges as x, applyProjectSelection as y };
