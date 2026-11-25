import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _N as N8nText_default, jN as useI18n } from "./app-D5flEmb-.js";
//#region ../../modules/promotions/frontend/src/promotionPreview.content.ts
/**
* What a side without a file says. The preview pages compare a branch with this instance.
* A page that compares other sides, such as two commits of a review, provides its own text.
*/
var PromotionAbsentSideLabelsKey = Symbol("PromotionAbsentSideLabels");
function sideState(detail, side) {
	const content = detail[side];
	if (content !== null && content !== void 0) return {
		kind: "content",
		content
	};
	return detail.revision[side] === null ? { kind: "absent" } : { kind: "unreadable" };
}
function hasUnreadableSide(detail) {
	return sideState(detail, "before").kind === "unreadable" || sideState(detail, "after").kind === "unreadable";
}
var FIELD_IDS = [
	"name",
	"description",
	"icon",
	"location",
	"type",
	"data",
	"value"
];
function fieldsOf(detail, side) {
	switch (detail.type) {
		case "project": {
			const project = detail[side];
			if (!project) return {};
			return {
				name: project.name,
				description: project.description,
				icon: project.icon?.value
			};
		}
		case "folder": {
			const folder = detail[side];
			return folder ? { name: folder.name } : {};
		}
		case "credential": {
			const credential = detail[side];
			if (!credential) return {};
			return {
				name: credential.name,
				type: credential.type,
				data: credential.data ? JSON.stringify(credential.data, null, 2) : void 0
			};
		}
		case "variable": {
			const variable = detail[side];
			if (!variable) return {};
			return {
				name: variable.name,
				type: variable.type,
				value: variable.value
			};
		}
		case "tag": {
			const tag = detail[side];
			return tag ? { name: tag.name } : {};
		}
		case "dataTable":
		case "workflow": return {};
	}
}
/** Moves come from the preview resource, which already applies the operation rules. */
function locationOf({ resource, containerName }, side) {
	if (resource.previousParentKey === void 0) return {};
	const key = side === "before" ? resource.previousParentKey : resource.parentKey;
	return key === null ? {} : { location: containerName(key) };
}
/**
* The fields that the operation changes. An unchanged resource has none, even when its two files
* differ, because the operation keeps the local value.
*/
function describeFieldChanges(detail, context) {
	const { resource } = context;
	if (resource.change === "unchanged") return [];
	const before = {
		...fieldsOf(detail, "before"),
		...locationOf(context, "before")
	};
	const after = {
		...fieldsOf(detail, "after"),
		...locationOf(context, "after")
	};
	return FIELD_IDS.filter((field) => before[field] !== after[field]).map((field) => ({
		field,
		before: before[field],
		after: after[field]
	}));
}
/** The rename and move of a workflow. The workflow diff shows the rest. */
function describeWorkflowFieldChanges(context) {
	const { resource } = context;
	const changes = [];
	if (resource.previousName !== void 0) changes.push({
		field: "name",
		before: resource.previousName,
		after: resource.name
	});
	if (resource.previousParentKey !== void 0) {
		const before = locationOf(context, "before").location;
		const after = locationOf(context, "after").location;
		changes.push({
			field: "location",
			before,
			after
		});
	}
	return changes;
}
function describeDataTable(detail, resource, direction) {
	const changes = resource.change === "modified" ? detail.dataTableChanges ?? [] : [];
	const after = sideState(detail, "after");
	const addedColumns = resource.change === "added" && after.kind === "content" ? [...after.content.columns].sort((a, b) => a.index - b.index) : [];
	return {
		changes,
		warnsAboutDataLoss: direction === "apply",
		addedColumns
	};
}
/** True when the files changed after the preview loaded, so the card can be out of date. */
function isStaleDetail(detail, resource) {
	return detail.revision.before !== resource.revision.before || detail.revision.after !== resource.revision.after;
}
//#endregion
//#region ../../modules/promotions/frontend/src/promotionPreview.workflow.ts
/** Turns one side of a workflow detail into a snapshot for the `workflow-diff` slot. */
function toPromotionDiffSide(detail, side, tagName) {
	const state = sideState(detail, side);
	if (state.kind !== "content") return state;
	const workflow = state.content;
	return {
		kind: "content",
		content: {
			workflowName: workflow.name,
			versionId: `promotion-${side}-${detail.revision[side] ?? ""}`,
			nodes: workflow.nodes,
			connections: workflow.connections,
			nodeGroups: workflow.nodeGroups,
			settings: workflow.settings,
			tags: (workflow.tagIds ?? []).map((id) => ({
				id,
				name: tagName(id)
			})),
			isArchived: workflow.isArchived
		}
	};
}
/** Only changed workflows have a diff. */
function hasWorkflowDiff(resource) {
	return resource.type === "workflow" && resource.change !== "unchanged";
}
/** Promote changes the branch to match this instance. Apply does the opposite. */
function isBranchSide(side, direction) {
	return side === (direction === "promote" ? "before" : "after");
}
/** The inspected workflow, otherwise the first workflow with a diff. */
function defaultActiveWorkflow(order, resources, inspectedKey) {
	const candidates = order.filter((key) => {
		const resource = resources.get(key);
		return !!resource && hasWorkflowDiff(resource);
	});
	return candidates.find((key) => key === inspectedKey) ?? candidates[0];
}
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionWorkflowSideLabel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PromotionWorkflowSideLabel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionWorkflowSideLabel",
	props: { side: {} },
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nText_default), {
				color: "text-dark",
				size: "small",
				compact: "",
				class: normalizeClass(_ctx.$style.badge)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`workflowDiff.label.${__props.side}`)), 1)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": { badge: "_badge_1u3je_1" } }]]);
//#endregion
export { toPromotionDiffSide as a, describeFieldChanges as c, isStaleDetail as d, sideState as f, isBranchSide as i, describeWorkflowFieldChanges as l, defaultActiveWorkflow as n, PromotionAbsentSideLabelsKey as o, hasWorkflowDiff as r, describeDataTable as s, PromotionWorkflowSideLabel_default as t, hasUnreadableSide as u };
