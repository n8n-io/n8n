import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Lf as markRaw, Nf as init_reactivity_esm_bundler, Rd as computed, Ud as createSlots, ff as openBlock, hf as renderSlot } from "./vendor-Hx42-oQF.js";
import { Ik as deepCopy } from "./app-D5flEmb-.js";
import { t as WorkflowDiffView_default } from "./WorkflowDiffView-BDT5YKXW.js";
//#region src/features/workflows/workflowDiff/workflowDiff.utils.ts
init_reactivity_esm_bundler();
/**
* Builds a detached, non-reactive workflow for the diff viewer. A reactive source makes the
* viewer hydrate and dispose its workflow documents in a loop.
*/
function toDiffWorkflow(input) {
	const createdAt = input.createdAt ?? "";
	return markRaw(deepCopy({
		id: input.id,
		name: input.name,
		active: false,
		isArchived: input.isArchived ?? false,
		createdAt,
		updatedAt: createdAt,
		versionId: input.versionId,
		activeVersionId: null,
		nodes: input.nodes,
		connections: input.connections,
		nodeGroups: input.nodeGroups,
		settings: {
			...input.settings ?? {},
			executionOrder: input.settings?.executionOrder ?? "v0"
		},
		tags: input.tags
	}));
}
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffSlot.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffSlot.vue
var WorkflowDiffSlot_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffSlot",
	props: {
		workflowId: {},
		workflowName: {},
		sourceSnapshot: {},
		targetSnapshot: {},
		sourceLabel: {},
		targetLabel: {},
		showFullscreenButton: { type: Boolean },
		requireCanvasFocus: { type: Boolean },
		canvasIdPrefix: {},
		hideTitle: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		function toWorkflow(snapshot, side) {
			if (!snapshot) return void 0;
			return toDiffWorkflow({
				id: props.workflowId,
				name: snapshot.workflowName ?? props.workflowName,
				versionId: snapshot.versionId ?? side,
				createdAt: snapshot.createdAt,
				nodes: snapshot.nodes,
				connections: snapshot.connections,
				nodeGroups: snapshot.nodeGroups,
				settings: snapshot.settings,
				tags: snapshot.tags && [...snapshot.tags].sort((a, b) => a.name.localeCompare(b.name)),
				isArchived: snapshot.isArchived
			});
		}
		const sourceWorkflow = computed(() => toWorkflow(props.sourceSnapshot, "source"));
		const targetWorkflow = computed(() => toWorkflow(props.targetSnapshot, "target"));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(WorkflowDiffView_default, {
				"source-workflow": sourceWorkflow.value,
				"target-workflow": targetWorkflow.value,
				"source-label": __props.sourceLabel,
				"target-label": __props.targetLabel,
				"show-fullscreen-button": __props.showFullscreenButton,
				"require-canvas-focus": __props.requireCanvasFocus,
				"canvas-id-prefix": __props.canvasIdPrefix,
				"hide-title": __props.hideTitle
			}, createSlots({ _: 2 }, [
				_ctx.$slots.sourceLabel ? {
					name: "sourceLabel",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "sourceLabel")]),
					key: "0"
				} : void 0,
				_ctx.$slots.targetLabel ? {
					name: "targetLabel",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "targetLabel")]),
					key: "1"
				} : void 0,
				_ctx.$slots.sourceEmptyText ? {
					name: "sourceEmptyText",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "sourceEmptyText")]),
					key: "2"
				} : void 0,
				_ctx.$slots.targetEmptyText ? {
					name: "targetEmptyText",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "targetEmptyText")]),
					key: "3"
				} : void 0
			]), 1032, [
				"source-workflow",
				"target-workflow",
				"source-label",
				"target-label",
				"show-fullscreen-button",
				"require-canvas-focus",
				"canvas-id-prefix",
				"hide-title"
			]);
		};
	}
});
//#endregion
export { WorkflowDiffSlot_default as default };
