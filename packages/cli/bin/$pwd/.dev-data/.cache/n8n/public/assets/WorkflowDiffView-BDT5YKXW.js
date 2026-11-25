import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Ef as watchEffect, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Iu as useEventListener, Jd as defineComponent, Jf as toValue, Kd as createVNode, Ld as Teleport, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Qr as _sfc_main$d, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xd as guardReactiveProps, Xf as unref, _p as normalizeClass, ad as createInjectionState, bf as useId, ci as useVueFlow, ff as openBlock, hf as renderSlot, id as createEventHook, ip as init_shared_esm_bundler, jf as effectScope, kd as useCssVars, lf as onMounted, mf as renderList, rf as mergeProps, vp as normalizeProps, xu as onClickOutside, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Bh as createEmptyCanvasRenderData, Qd as disposeWorkflowDocumentStore, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Tj as N8nResizeWrapper_default, Vd as useWorkflowExecutionStateStore, Vp as removeWorkflowExecutionData, Xd as createWorkflowDocumentId, _N as N8nText_default, bC as useRootStore, dC as useToast, eN as DropdownMenuItem_default, hu as NodeIcon_default, jM as createEventBus, jN as useI18n, kj as N8nSegmentControl_default, nf as useWorkflowDocumentStore, oO as NodeDiffStatus, p as telemetry, sO as compareWorkflowsNodes, sn as DiffBadge_default, uf as useNodeTypesStore, vN as N8nIconButton_default, yN as N8nButton_default, zd as disposeWorkflowExecutionStateStore } from "./app-D5flEmb-.js";
import { t as NodeDiff_default } from "./NodeDiff-Bzmpe6a_.js";
import { n as WorkflowDiffToolbar_default, t as WorkflowDiffPanels_default } from "./WorkflowDiffPanels-BuGCS9S6.js";
import { f as CanvasEdge_default, h as CanvasBackground_default, l as CanvasNode_default, n as useCanvasMapping, r as Canvas_default, t as useWorkflowDocumentRenderData } from "./useWorkflowDocumentRenderData-CrajykLm.js";
//#region src/features/workflows/workflowDiff/WorkflowDiffEmptyState.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowDiffEmptyState_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffEmptyState",
	props: { text: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("li", { class: normalizeClass(_ctx.$style.emptyState) }, [createVNode(unref(N8nText_default), {
				color: "text-base",
				size: "small"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.text), 1)]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": { emptyState: "_emptyState_13uw3_1" } }]]);
//#endregion
//#region src/features/workflows/workflowDiff/useViewportSync.ts
init_reactivity_esm_bundler();
var [useProvideViewportSync, useInject] = createInjectionState(() => {
	const onViewportChange = createEventHook();
	const onNodeClick = createEventHook();
	const selectedDetailId = ref();
	const syncIsEnabled = ref(true);
	/**
	* Batches viewport sync using requestAnimationFrame to avoid flooding listeners
	* Provides a better performance by reducing the number of updates
	* and ensuring that all updates are processed in a single frame.
	* it's better than throttling because it allows for smoother updates
	* and avoids the "jank" that can occur with throttling.
	*/
	let scheduledFrameId = null;
	let pendingUpdate = null;
	function triggerViewportChange(update) {
		if (!syncIsEnabled.value) return;
		pendingUpdate = update;
		scheduledFrameId ??= requestAnimationFrame(() => {
			if (pendingUpdate) {
				onViewportChange.trigger(pendingUpdate);
				pendingUpdate = null;
			}
			scheduledFrameId = null;
		});
	}
	return {
		onViewportChange: onViewportChange.on,
		triggerViewportChange,
		onNodeClick: onNodeClick.on,
		triggerNodeClick: onNodeClick.trigger,
		selectedDetailId,
		syncIsEnabled
	};
});
function useInjectViewportSync() {
	const state = useInject();
	if (!state) throw new Error("Please call \"useProvideViewportSync\" on the appropriate parent component");
	return state;
}
//#endregion
//#region src/features/workflows/workflowDiff/SyncedWorkflowCanvas.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { style: {
	"width": "100%",
	"height": "100%",
	"position": "relative"
} };
//#endregion
//#region src/features/workflows/workflowDiff/SyncedWorkflowCanvas.vue
var SyncedWorkflowCanvas_default = /* @__PURE__ */ defineComponent({
	__name: "SyncedWorkflowCanvas",
	props: {
		id: {},
		nodes: {},
		connections: {},
		renderData: {},
		applyLayout: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const eventBus = createEventBus();
		const { setViewport, onViewportChange: onLocalViewportChange, onNodeClick, fitView, findNode, addSelectedNodes, onPaneClick, onNodesInitialized, updateNode } = useVueFlow({ id: props.id });
		onNodesInitialized(() => {
			if (props.applyLayout) eventBus.emit("tidyUp", { source: "import-workflow-data" });
		});
		/**
		* Calculate the offset needed to shift nodes so the topmost-leftmost node is at origin.
		* Finds the anchor node (smallest Y, then smallest X) and returns the negative of its position.
		*/
		function calculateOriginOffset(nodes) {
			if (nodes.length === 0) return {
				x: 0,
				y: 0
			};
			let minX = nodes[0].x;
			let minY = nodes[0].y;
			for (const node of nodes) if (node.y < minY || node.y === minY && node.x < minX) {
				minX = node.x;
				minY = node.y;
			}
			return {
				x: -minX,
				y: -minY
			};
		}
		async function onTidyUp({ result }) {
			const offset = calculateOriginOffset(result.nodes);
			result.nodes.forEach(({ id, x, y }) => {
				updateNode(id, { position: {
					x: x + offset.x,
					y: y + offset.y
				} });
			});
			setTimeout(() => {
				fitView({ padding: 1 });
			}, 100);
		}
		const { triggerViewportChange, onViewportChange, selectedDetailId, triggerNodeClick } = useInjectViewportSync();
		/**
		* Flag to ignore viewport changes triggered by remote updates,
		* preventing infinite sync loops between canvases
		*/
		let isApplyingRemoteUpdate = false;
		onLocalViewportChange((vp) => {
			if (isApplyingRemoteUpdate) return;
			triggerViewportChange({
				from: props.id,
				viewport: vp
			});
		});
		onViewportChange(({ from, viewport }) => {
			if (from === props.id) return;
			isApplyingRemoteUpdate = true;
			setViewport(viewport);
			requestAnimationFrame(() => isApplyingRemoteUpdate = false);
		});
		onNodeClick(({ node }) => triggerNodeClick(node.id));
		onPaneClick(() => {
			setTimeout(() => {
				const node = findNode(selectedDetailId.value);
				if (!node) {
					addSelectedNodes([]);
					return;
				}
				addSelectedNodes([node]);
			}, 0);
		});
		watch(selectedDetailId, (id) => {
			const node = findNode(id);
			if (!node) {
				addSelectedNodes([]);
				return;
			}
			addSelectedNodes([node]);
			const paddingRatio = node.dimensions.height * 5 / Math.max(node.dimensions.width, node.dimensions.height);
			fitView({
				nodes: [node.id],
				padding: paddingRatio,
				duration: 500
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$1, [createVNode(Canvas_default, {
				id: __props.id,
				nodes: __props.nodes,
				connections: __props.connections,
				"render-data": __props.renderData,
				"read-only": true,
				"event-bus": unref(eventBus),
				"show-node-groups": false,
				style: {
					"width": "100%",
					"height": "100%"
				},
				onTidyUp
			}, {
				node: withCtx(({ nodeProps }) => [renderSlot(_ctx.$slots, "node", normalizeProps(guardReactiveProps({ nodeProps })))]),
				edge: withCtx(({ edgeProps, arrowHeadMarkerId }) => [renderSlot(_ctx.$slots, "edge", normalizeProps(guardReactiveProps({
					edgeProps,
					arrowHeadMarkerId
				})))]),
				"canvas-background": withCtx(({ viewport }) => [createVNode(CanvasBackground_default, {
					striped: false,
					viewport
				}, null, 8, ["viewport"])]),
				_: 3
			}, 8, [
				"id",
				"nodes",
				"connections",
				"render-data",
				"event-bus"
			])]);
		};
	}
});
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffAside.vue?vue&type=script&setup=true&lang.ts
init_runtime_dom_esm_bundler(), init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowDiffAside_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffAside",
	props: { node: {} },
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		useCssVars((_ctx) => ({ "v994490fe": panelWidth.value }));
		const props = __props;
		const nodeTypesStore = useNodeTypesStore();
		const nodeType = computed(() => nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion));
		const panelWidth = ref(350);
		function onResize({ width }) {
			panelWidth.value = width;
		}
		const outputFormat = ref("line-by-line");
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nResizeWrapper_default), {
				class: normalizeClass(_ctx.$style.workflowDiffAside),
				width: panelWidth.value,
				"min-width": 260,
				"supported-directions": ["left"],
				"grid-size": 8,
				onResize
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.asideHeader) }, [
					createVNode(NodeIcon_default, {
						class: "ml-xs",
						"node-type": nodeType.value,
						size: 16
					}, null, 8, ["node-type"]),
					createVNode(unref(N8nHeading_default), {
						size: "small",
						color: "text-dark",
						bold: "",
						class: normalizeClass(_ctx.$style.nodeTitle)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.node.name), 1)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "x",
						class: "ml-auto",
						onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
					})
				], 2), renderSlot(_ctx.$slots, "default", normalizeProps(guardReactiveProps({ outputFormat: outputFormat.value })))]),
				_: 3
			}, 8, ["class", "width"]);
		};
	}
}), [["__cssModules", { "$style": {
	workflowDiffAside: "_workflowDiffAside_1uizj_1",
	asideHeader: "_asideHeader_1uizj_10",
	nodeTitle: "_nodeTitle_1uizj_18"
} }]]);
//#endregion
//#region src/features/workflows/workflowDiff/HighlightedEdge.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/workflows/workflowDiff/HighlightedEdge.vue
var HighlightedEdge_default = /* @__PURE__ */ defineComponent({
	__name: "HighlightedEdge",
	props: {
		id: {},
		sourceNode: {},
		targetNode: {},
		source: {},
		target: {},
		type: {},
		label: { type: [
			String,
			Object,
			Function
		] },
		style: {},
		selected: { type: Boolean },
		sourcePosition: {},
		targetPosition: {},
		sourceHandleId: {},
		targetHandleId: {},
		animated: { type: Boolean },
		updatable: { type: Boolean },
		markerStart: {},
		markerEnd: {},
		curvature: {},
		interactionWidth: {},
		data: {},
		events: {},
		labelStyle: {},
		labelShowBg: { type: Boolean },
		labelBgStyle: {},
		labelBgPadding: {},
		labelBgBorderRadius: {},
		sourceX: {},
		sourceY: {},
		targetX: {},
		targetY: {},
		readOnly: { type: Boolean },
		hovered: { type: Boolean },
		bringToFront: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return openBlock(), createBlock(CanvasEdge_default, mergeProps(props, {
				"read-only": "",
				selected: false,
				selectable: false
			}), {
				highlight: withCtx(({ segments }) => [(openBlock(true), createElementBlock(Fragment, null, renderList(segments, (segment) => {
					return openBlock(), createBlock(unref(_sfc_main$d), {
						key: segment[0],
						style: {
							strokeWidth: 15,
							stroke: "var(--edge--color--highlight)"
						},
						path: segment[0],
						"interaction-width": 0
					}, null, 8, ["path"]);
				}), 128))]),
				_: 1
			}, 16);
		};
	}
});
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var WorkflowDiffContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffContent",
	props: {
		sourceNodes: {},
		sourceConnections: {},
		sourceRenderData: {},
		targetNodes: {},
		targetConnections: {},
		targetRenderData: {},
		sourceLabel: {},
		targetLabel: {},
		sourceExists: { type: Boolean },
		targetExists: { type: Boolean },
		selectedNode: {},
		nodeDiffs: {},
		isSourceWorkflowNew: { type: Boolean },
		applyLayout: { type: Boolean },
		nodesDiff: {},
		connectionsDiff: {},
		canvasIdPrefix: {}
	},
	emits: ["closeAside"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const $style = useCssModule();
		const sourceCanvasId = computed(() => props.canvasIdPrefix ? `${props.canvasIdPrefix}-top` : "top");
		const targetCanvasId = computed(() => props.canvasIdPrefix ? `${props.canvasIdPrefix}-bottom` : "bottom");
		function getNodeStatusClass(id) {
			const status = props.nodesDiff?.get(id)?.status ?? "equal";
			return $style[status];
		}
		function getEdgeStatusClass(id) {
			const status = props.connectionsDiff?.get(id)?.status ?? NodeDiffStatus.Eq;
			return $style[`edge-${status}`];
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(unref($style).workflowDiffContent) }, [createVNode(WorkflowDiffPanels_default, {
				"source-label": __props.sourceLabel,
				"target-label": __props.targetLabel
			}, createSlots({
				source: withCtx(() => [__props.sourceExists ? (openBlock(), createBlock(SyncedWorkflowCanvas_default, {
					key: 0,
					id: sourceCanvasId.value,
					nodes: __props.sourceNodes,
					connections: __props.sourceConnections,
					"render-data": __props.sourceRenderData,
					"apply-layout": __props.applyLayout
				}, {
					node: withCtx(({ nodeProps }) => [createVNode(CanvasNode_default, mergeProps(nodeProps, {
						"read-only": true,
						class: { [getNodeStatusClass(nodeProps.id)]: true }
					}), {
						toolbar: withCtx(() => [..._cache[1] || (_cache[1] = [])]),
						_: 1
					}, 16, ["class"])]),
					edge: withCtx(({ edgeProps, arrowHeadMarkerId }) => [createVNode(HighlightedEdge_default, mergeProps(edgeProps, {
						"marker-end": `url(#${arrowHeadMarkerId})`,
						class: { [getEdgeStatusClass(edgeProps.id)]: true }
					}), null, 16, ["marker-end", "class"])]),
					_: 1
				}, 8, [
					"id",
					"nodes",
					"connections",
					"render-data",
					"apply-layout"
				])) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(unref($style).emptyWorkflow)
				}, [createVNode(unref(N8nHeading_default), { size: "large" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.isSourceWorkflowNew ? unref(i18n).baseText("workflowDiff.newWorkflow") : unref(i18n).baseText("workflowDiff.deletedWorkflow")), 1)]),
					_: 1
				}), renderSlot(_ctx.$slots, "sourceEmptyText")], 2))]),
				target: withCtx(() => [__props.targetExists ? (openBlock(), createBlock(SyncedWorkflowCanvas_default, {
					key: 0,
					id: targetCanvasId.value,
					nodes: __props.targetNodes,
					connections: __props.targetConnections,
					"render-data": __props.targetRenderData,
					"apply-layout": __props.applyLayout
				}, {
					node: withCtx(({ nodeProps }) => [createVNode(CanvasNode_default, mergeProps(nodeProps, {
						"read-only": true,
						class: { [getNodeStatusClass(nodeProps.id)]: true }
					}), {
						toolbar: withCtx(() => [..._cache[2] || (_cache[2] = [])]),
						_: 1
					}, 16, ["class"])]),
					edge: withCtx(({ edgeProps, arrowHeadMarkerId }) => [createVNode(HighlightedEdge_default, mergeProps(edgeProps, {
						"marker-end": `url(#${arrowHeadMarkerId})`,
						class: { [getEdgeStatusClass(edgeProps.id)]: true }
					}), null, 16, ["marker-end", "class"])]),
					_: 1
				}, 8, [
					"id",
					"nodes",
					"connections",
					"render-data",
					"apply-layout"
				])) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(unref($style).emptyWorkflow)
				}, [createVNode(unref(N8nHeading_default), { size: "large" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowDiff.deletedWorkflow")), 1)]),
					_: 1
				}), renderSlot(_ctx.$slots, "targetEmptyText")], 2))]),
				_: 2
			}, [_ctx.$slots.sourceLabel ? {
				name: "sourceLabel",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "sourceLabel")]),
				key: "0"
			} : void 0, _ctx.$slots.targetLabel ? {
				name: "targetLabel",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "targetLabel")]),
				key: "1"
			} : void 0]), 1032, ["source-label", "target-label"]), __props.selectedNode ? (openBlock(), createBlock(WorkflowDiffAside_default, {
				key: 0,
				node: __props.selectedNode,
				onClose: _cache[0] || (_cache[0] = ($event) => emit("closeAside"))
			}, {
				default: withCtx(({ outputFormat }) => [createVNode(NodeDiff_default, mergeProps(__props.nodeDiffs, { "output-format": outputFormat }), null, 16, ["output-format"])]),
				_: 1
			}, 8, ["node"])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	workflowDiffContent: "_workflowDiffContent_ihwq1_1",
	emptyWorkflow: "_emptyWorkflow_ihwq1_8",
	deleted: "_deleted_ihwq1_17 _deleted_pmpky_20",
	added: "_added_ihwq1_21 _added_pmpky_21",
	equal: "_equal_ihwq1_25 _equal_pmpky_111",
	modified: "_modified_ihwq1_29 _modified_pmpky_22",
	"edge-deleted": "_edge-deleted_ihwq1_34 _edge-deleted_pmpky_148",
	"edge-added": "_edge-added_ihwq1_38 _edge-added_pmpky_153",
	"edge-equal": "_edge-equal_ihwq1_42 _edge-equal_pmpky_158"
} }]]);
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffNodeItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowDiffNodeItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffNodeItem",
	props: {
		nodeType: {},
		nodeName: {},
		isActive: { type: Boolean },
		isCompact: { type: Boolean },
		badgeType: {}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const itemId = useId();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenuItem_default), {
				id: unref(itemId),
				label: __props.nodeName ?? "",
				"close-on-select": false,
				class: normalizeClass({
					[_ctx.$style.active]: __props.isActive === true,
					[_ctx.$style.compact]: __props.isCompact === true
				}),
				onSelect: _cache[0] || (_cache[0] = ($event) => emit("select"))
			}, {
				"item-leading": withCtx(({ ui }) => [__props.badgeType !== void 0 ? (openBlock(), createBlock(DiffBadge_default, {
					key: 0,
					type: __props.badgeType,
					class: normalizeClass(ui.class)
				}, null, 8, ["type", "class"])) : createCommentVNode("", true), createVNode(NodeIcon_default, {
					"node-type": __props.nodeType,
					size: 16,
					class: normalizeClass(ui.class)
				}, null, 8, ["node-type", "class"])]),
				_: 1
			}, 8, [
				"id",
				"label",
				"class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	active: "_active_18u4m_1",
	compact: "_compact_18u4m_5"
} }]]);
//#endregion
//#region src/features/workflows/workflowDiff/useWorkflowDiff.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function mapConnections(connections) {
	return connections.reduce((acc, connection) => {
		acc.set.add(connection.id);
		acc.map.set(connection.id, connection);
		return acc;
	}, {
		set: /* @__PURE__ */ new Set(),
		map: /* @__PURE__ */ new Map()
	});
}
function createWorkflowRefs(workflow) {
	const workflowRef = computed(() => toValue(workflow));
	const workflowNodes = ref([]);
	const workflowConnections = ref({});
	watchEffect(() => {
		const workflowValue = workflowRef.value;
		if (workflowValue) {
			const nodesWithIds = workflowValue.nodes.map((node) => {
				if (!node.id) return {
					...node,
					id: window.crypto.randomUUID()
				};
				return node;
			});
			workflowNodes.value = nodesWithIds;
			workflowConnections.value = workflowValue.connections;
		}
	});
	return {
		workflowRef,
		workflowNodes,
		workflowConnections
	};
}
function createWorkflowDiff(workflowRef, workflowNodes, workflowConnections, renderData) {
	const { nodes, connections } = useCanvasMapping({
		nodes: workflowNodes,
		connections: workflowConnections,
		renderData
	});
	return {
		canvasData: computed(() => {
			if (!workflowRef.value) return {
				workflow: void 0,
				nodes: [],
				connections: []
			};
			return {
				workflow: workflowRef,
				nodes: nodes.value.map((node) => {
					node.draggable = false;
					node.selectable = false;
					node.focusable = false;
					return node;
				}),
				connections: connections.value.map((connection) => {
					connection.selectable = false;
					connection.focusable = false;
					connection.label = "";
					return connection;
				})
			};
		}),
		workflowNodes
	};
}
function createDiffRenderData(workflowRef, workflowNodes, side) {
	const renderData = shallowRef(createEmptyCanvasRenderData());
	let workflowDocumentStore = null;
	let currentDocumentId = null;
	let renderDataScope;
	function disposeStores() {
		renderDataScope?.stop();
		renderDataScope = void 0;
		if (currentDocumentId) {
			disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(currentDocumentId));
			currentDocumentId = null;
		}
		if (workflowDocumentStore) {
			disposeWorkflowDocumentStore(workflowDocumentStore);
			workflowDocumentStore = null;
		}
	}
	watch([workflowRef, workflowNodes], ([wf]) => {
		if (!wf?.id) return;
		disposeStores();
		const versionId = wf.versionId ?? `diff-${side}`;
		const docId = createWorkflowDocumentId(wf.id, versionId);
		workflowDocumentStore = useWorkflowDocumentStore(docId);
		workflowDocumentStore.hydrate({
			...wf,
			nodes: workflowNodes.value.map((node) => ({ ...node })),
			versionId
		});
		currentDocumentId = docId;
		renderDataScope = effectScope(true);
		renderDataScope.run(() => {
			renderData.value = useWorkflowDocumentRenderData(docId);
		});
	}, { immediate: true });
	return {
		renderData,
		dispose: disposeStores
	};
}
var useWorkflowDiff = (sourceWorkflow, targetWorkflow) => {
	const nodeTypesStore = useNodeTypesStore();
	const sourceRefs = createWorkflowRefs(sourceWorkflow);
	const targetRefs = createWorkflowRefs(targetWorkflow);
	const { renderData: sourceRenderData, dispose: disposeSource } = createDiffRenderData(sourceRefs.workflowRef, sourceRefs.workflowNodes, "source");
	const { renderData: targetRenderData, dispose: disposeTarget } = createDiffRenderData(targetRefs.workflowRef, targetRefs.workflowNodes, "target");
	const sourceDiff = createWorkflowDiff(sourceRefs.workflowRef, sourceRefs.workflowNodes, sourceRefs.workflowConnections, sourceRenderData);
	const targetDiff = createWorkflowDiff(targetRefs.workflowRef, targetRefs.workflowNodes, targetRefs.workflowConnections, targetRenderData);
	onScopeDispose(() => {
		disposeSource();
		disposeTarget();
	});
	const source = sourceDiff.canvasData;
	const target = targetDiff.canvasData;
	const nodesDiff = computed(() => {
		const sourceNodes = sourceDiff.workflowNodes.value;
		const targetNodes = targetDiff.workflowNodes.value;
		if (sourceNodes.length === 0 && targetNodes.length === 0) return /* @__PURE__ */ new Map();
		return compareWorkflowsNodes(sourceNodes, targetNodes);
	});
	function formatConnectionDiff(id, status, collection, accumulator) {
		const connection = collection.get(id);
		if (!connection) return;
		const sourceNode = nodesDiff.value.get(connection.source)?.node;
		const targetNode = nodesDiff.value.get(connection.target)?.node;
		accumulator.set(id, {
			status,
			connection: {
				id,
				source: sourceNode,
				target: targetNode,
				sourceType: sourceNode ? nodeTypesStore.getNodeType(sourceNode.type, sourceNode.typeVersion) : null,
				targetType: targetNode ? nodeTypesStore.getNodeType(targetNode.type, targetNode.typeVersion) : null
			}
		});
	}
	return {
		source,
		target,
		sourceRenderData,
		targetRenderData,
		nodesDiff,
		connectionsDiff: computed(() => {
			const sourceConnections = mapConnections(source.value?.connections ?? []);
			const targetConnections = mapConnections(target.value?.connections ?? []);
			if (sourceConnections.set.size === 0 && targetConnections.set.size === 0) return /* @__PURE__ */ new Map();
			const added = targetConnections.set.difference(sourceConnections.set);
			const removed = sourceConnections.set.difference(targetConnections.set);
			const acc = /* @__PURE__ */ new Map();
			for (const id of added.values()) formatConnectionDiff(id, NodeDiffStatus.Added, targetConnections.map, acc);
			for (const id of removed.values()) formatConnectionDiff(id, NodeDiffStatus.Deleted, sourceConnections.map, acc);
			return acc;
		})
	};
};
//#endregion
//#region src/features/workflows/workflowDiff/useWorkflowDiffUI.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useWorkflowDiffUI(options) {
	const { sourceWorkflow, targetWorkflow, nodesDiff, connectionsDiff, selectedDetailId, onNavigate, onTabChange } = options;
	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();
	const settingsDiff = computed(() => {
		const sourceSettings = sourceWorkflow.value?.settings ?? {};
		const targetSettings = targetWorkflow.value?.settings ?? {};
		const allKeys = new Set([...Object.keys(sourceSettings), ...Object.keys(targetSettings)].filter((key) => key in sourceSettings || key in targetSettings));
		const settings = Array.from(allKeys).reduce((acc, key) => {
			const val1 = sourceSettings[key];
			const val2 = targetSettings[key];
			if (val1 !== val2) acc.push({
				name: key,
				before: String(val1),
				after: String(val2)
			});
			return acc;
		}, []);
		const sourceName = sourceWorkflow.value?.name;
		const targetName = targetWorkflow.value?.name;
		if (sourceName && targetName && sourceName !== targetName) settings.unshift({
			name: "name",
			before: sourceName,
			after: targetName
		});
		const sourceTags = (sourceWorkflow.value?.tags ?? []).map((tag) => typeof tag === "string" ? tag : tag.name);
		const targetTags = (targetWorkflow.value?.tags ?? []).map((tag) => typeof tag === "string" ? tag : tag.name);
		if (JSON.stringify(sourceTags) !== JSON.stringify(targetTags)) settings.push({
			name: "tags",
			before: JSON.stringify(sourceTags, null, 2),
			after: JSON.stringify(targetTags, null, 2)
		});
		return settings;
	});
	const nodeChanges = computed(() => {
		if (!nodesDiff.value) return [];
		return [...nodesDiff.value.values()].filter((change) => change.status !== NodeDiffStatus.Eq).map((change) => ({
			...change,
			type: nodeTypesStore.getNodeType(change.node.type, change.node.typeVersion)
		}));
	});
	function nextNodeChange() {
		const nextIndex = (nodeChanges.value.findIndex((change) => change.node.id === selectedDetailId.value) + 1) % nodeChanges.value.length;
		selectedDetailId.value = nodeChanges.value[nextIndex]?.node.id;
		onNavigate?.("next");
	}
	function previousNodeChange() {
		const previousIndex = (nodeChanges.value.findIndex((change) => change.node.id === selectedDetailId.value) - 1 + nodeChanges.value.length) % nodeChanges.value.length;
		selectedDetailId.value = nodeChanges.value[previousIndex]?.node.id;
		onNavigate?.("previous");
	}
	const activeTab = ref();
	const tabs = computed(() => [
		{
			value: "nodes",
			label: i18n.baseText("workflowDiff.nodes"),
			disabled: false,
			data: { count: nodeChanges.value.length }
		},
		{
			value: "connectors",
			label: i18n.baseText("workflowDiff.connectors"),
			disabled: false,
			data: { count: connectionsDiff.value.size }
		},
		{
			value: "settings",
			label: i18n.baseText("workflowDiff.settings"),
			disabled: false,
			data: { count: settingsDiff.value.length }
		}
	]);
	function setActiveTab(active) {
		if (!active) {
			activeTab.value = void 0;
			return;
		}
		activeTab.value = "nodes";
		onTabChange?.("nodes");
	}
	const selectedNode = computed(() => {
		const id = selectedDetailId.value;
		if (!id) return void 0;
		return targetWorkflow.value?.nodes.find((node) => node.id === id) ?? sourceWorkflow.value?.nodes.find((node) => node.id === id) ?? nodesDiff.value.get(id)?.node;
	});
	const nodeDiffs = computed(() => {
		if (!selectedDetailId.value) return {
			oldString: "",
			newString: ""
		};
		const sourceNode = sourceWorkflow.value?.nodes.find((node) => node.id === selectedDetailId.value);
		const targetNode = targetWorkflow.value?.nodes.find((node) => node.id === selectedDetailId.value);
		function replacer(key, value, nodeType) {
			if (key === "position") return;
			if ((key === "jsCode" || key === "content" && nodeType === "n8n-nodes-base.stickyNote") && typeof value === "string") return value.split("\n");
			return value;
		}
		const withNodeType = (type) => (key, value) => replacer(key, value, type);
		return {
			oldString: JSON.stringify(sourceNode, withNodeType(sourceNode?.type), 2) ?? "",
			newString: JSON.stringify(targetNode, withNodeType(targetNode?.type), 2) ?? ""
		};
	});
	const changesCount = computed(() => nodeChanges.value.length + connectionsDiff.value.size + settingsDiff.value.length);
	const isSourceWorkflowNew = computed(() => {
		const sourceExists = !!sourceWorkflow.value;
		const targetExists = !!targetWorkflow.value;
		return !sourceExists && targetExists;
	});
	function setSelectedDetailId(nodeId) {
		selectedDetailId.value = nodeId;
	}
	return {
		settingsDiff,
		nodeChanges,
		nextNodeChange,
		previousNodeChange,
		activeTab,
		tabs,
		setActiveTab,
		selectedNode,
		nodeDiffs,
		changesCount,
		isSourceWorkflowNew,
		setSelectedDetailId
	};
}
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["tabindex"];
var _hoisted_2 = {
	key: 0,
	class: "ml-4xs"
};
var _hoisted_3 = { key: 0 };
var WorkflowDiffView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffView",
	props: {
		sourceWorkflow: { default: void 0 },
		targetWorkflow: { default: void 0 },
		sourceLabel: { default: "Before" },
		targetLabel: { default: "After" },
		tidyUp: { type: Boolean },
		showBackButton: {
			type: Boolean,
			default: false
		},
		showFullscreenButton: {
			type: Boolean,
			default: false
		},
		requireCanvasFocus: {
			type: Boolean,
			default: false
		},
		hideTitle: {
			type: Boolean,
			default: false
		},
		canvasIdPrefix: { default: void 0 },
		source: { default: "unknown" }
	},
	emits: ["back"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const { selectedDetailId, onNodeClick, syncIsEnabled } = useProvideViewportSync();
		const isFullscreen = ref(false);
		const viewer = ref();
		const isCanvasFocused = ref(false);
		const isWheelEnabled = computed(() => !props.requireCanvasFocus || isFullscreen.value || isCanvasFocused.value);
		onClickOutside(viewer, () => {
			isCanvasFocused.value = false;
		});
		function onFocusOut(event) {
			if (!(event.relatedTarget instanceof Node) || !viewer.value?.contains(event.relatedTarget)) isCanvasFocused.value = false;
		}
		function toggleFullscreen() {
			isFullscreen.value = !isFullscreen.value;
			isCanvasFocused.value = false;
		}
		useEventListener(document, "keydown", (event) => {
			if (event.key !== "Escape") return;
			isCanvasFocused.value = false;
			if (!isFullscreen.value) return;
			event.preventDefault();
			isFullscreen.value = false;
		});
		const $style = useCssModule();
		const nodeTypesStore = useNodeTypesStore();
		const rootStore = useRootStore();
		const i18n = useI18n();
		const toast = useToast();
		const { source, target, sourceRenderData, targetRenderData, nodesDiff, connectionsDiff } = useWorkflowDiff(computed(() => removeWorkflowExecutionData(props.sourceWorkflow)), computed(() => removeWorkflowExecutionData(props.targetWorkflow)));
		const { settingsDiff, nodeChanges, nextNodeChange, previousNodeChange, activeTab, tabs, setActiveTab, selectedNode, nodeDiffs, changesCount, isSourceWorkflowNew, setSelectedDetailId } = useWorkflowDiffUI({
			sourceWorkflow: computed(() => props.sourceWorkflow),
			targetWorkflow: computed(() => props.targetWorkflow),
			nodesDiff,
			connectionsDiff,
			selectedDetailId
		});
		onNodeClick((nodeId) => {
			const node = nodesDiff.value.get(nodeId);
			if (!node) return;
			if (node.status !== NodeDiffStatus.Eq) selectedDetailId.value = nodeId;
		});
		onMounted(async () => {
			try {
				await nodeTypesStore.loadNodeTypesIfNotLoaded();
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowDiff.error.loadNodeTypes"));
			}
		});
		const onChangesDropdownVisibleChange = (visible) => {
			setActiveTab(visible);
			if (visible) telemetry.track("user_opens_diff_changes_list", {
				instance_id: rootStore.instanceId,
				workflow_id: props.sourceWorkflow?.id ?? props.targetWorkflow?.id,
				source: props.source
			});
		};
		const onNodeChangeSelect = (change) => {
			setSelectedDetailId(change.node.id);
			telemetry.track("user_clicks_node_in_diff_changes_list", {
				instance_id: rootStore.instanceId,
				workflow_id: props.sourceWorkflow?.id ?? props.targetWorkflow?.id,
				node_id: change.node.id,
				node_name: change.node.name,
				node_status: change.status,
				source: props.source
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Teleport, {
				to: "body",
				disabled: !isFullscreen.value
			}, [createBaseVNode("div", {
				ref_key: "viewer",
				ref: viewer,
				class: normalizeClass([unref($style).workflowDiffViewContainer, {
					[unref($style).fullscreen]: isFullscreen.value,
					nowheel: !isWheelEnabled.value
				}]),
				tabindex: __props.requireCanvasFocus && !isFullscreen.value ? 0 : void 0,
				"data-test-id": "workflow-diff-view",
				onPointerdown: _cache[4] || (_cache[4] = ($event) => isCanvasFocused.value = true),
				onFocusin: _cache[5] || (_cache[5] = ($event) => isCanvasFocused.value = true),
				onFocusout: onFocusOut
			}, [createVNode(WorkflowDiffToolbar_default, {
				"sync-is-enabled": unref(syncIsEnabled),
				"onUpdate:syncIsEnabled": _cache[1] || (_cache[1] = ($event) => isRef(syncIsEnabled) ? syncIsEnabled.value = $event : null),
				title: __props.sourceWorkflow?.name || __props.targetWorkflow?.name,
				"hide-title": __props.hideTitle,
				"show-back-button": __props.showBackButton,
				"show-fullscreen-button": __props.showFullscreenButton,
				"is-fullscreen": isFullscreen.value,
				onBack: _cache[2] || (_cache[2] = ($event) => emit("back")),
				onPrevious: unref(previousNodeChange),
				onNext: unref(nextNodeChange),
				onFullscreen: toggleFullscreen
			}, {
				"header-prefix": withCtx(() => [renderSlot(_ctx.$slots, "header-prefix")]),
				changes: withCtx(() => [createVNode(unref(DropdownMenu_default), {
					items: [],
					placement: "bottom-end",
					width: "320px",
					"data-test-id": "workflow-diff-changes-menu",
					"onUpdate:modelValue": onChangesDropdownVisibleChange
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), { variant: "outline" }, {
						default: withCtx(() => [unref(changesCount) ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(unref($style).circleBadge)
						}, toDisplayString(unref(changesCount)), 3)) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(unref(i18n).baseText("workflowDiff.changes")), 1)]),
						_: 1
					})]),
					content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(unref($style).dropdownContent) }, [createVNode(unref(N8nSegmentControl_default), {
						modelValue: unref(activeTab),
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(activeTab) ? activeTab.value = $event : null),
						options: unref(tabs),
						class: normalizeClass(unref($style).tabs)
					}, {
						option: withCtx(({ label, data: optionData }) => [createTextVNode(toDisplayString(label) + " ", 1), optionData?.count ? (openBlock(), createElementBlock("span", _hoisted_2, " (" + toDisplayString(optionData.count) + ") ", 1)) : createCommentVNode("", true)]),
						_: 1
					}, 8, [
						"modelValue",
						"options",
						"class"
					]), createBaseVNode("div", null, [
						unref(activeTab) === "nodes" ? (openBlock(), createElementBlock("ul", _hoisted_3, [unref(nodeChanges).length > 0 ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(unref(nodeChanges), (change) => {
							return openBlock(), createBlock(WorkflowDiffNodeItem_default, {
								key: change.node.id,
								"badge-type": change.status,
								"node-type": change.type,
								"node-name": change.node.name,
								"is-active": unref(selectedDetailId) === change.node.id,
								onSelect: ($event) => onNodeChangeSelect(change)
							}, null, 8, [
								"badge-type",
								"node-type",
								"node-name",
								"is-active",
								"onSelect"
							]);
						}), 128)) : (openBlock(), createBlock(WorkflowDiffEmptyState_default, {
							key: 1,
							text: unref(i18n).baseText("workflowDiff.noChanges")
						}, null, 8, ["text"]))])) : createCommentVNode("", true),
						unref(activeTab) === "connectors" ? (openBlock(), createElementBlock("ul", {
							key: 1,
							class: normalizeClass(unref($style).changes)
						}, [unref(connectionsDiff).size > 0 ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(unref(connectionsDiff), (change) => {
							return openBlock(), createElementBlock("li", { key: change[0] }, [createBaseVNode("div", null, [createVNode(DiffBadge_default, { type: change[1].status }, null, 8, ["type"])]), createBaseVNode("div", null, [createBaseVNode("ul", null, [
								createVNode(WorkflowDiffNodeItem_default, {
									"node-type": change[1].connection.sourceType,
									"node-name": change[1].connection.source?.name,
									"is-active": unref(selectedDetailId) === change[1].connection.source?.id,
									"is-compact": "",
									onSelect: ($event) => unref(setSelectedDetailId)(change[1].connection.source?.id)
								}, null, 8, [
									"node-type",
									"node-name",
									"is-active",
									"onSelect"
								]),
								createBaseVNode("div", { class: normalizeClass(unref($style).separator) }, null, 2),
								createVNode(WorkflowDiffNodeItem_default, {
									"node-type": change[1].connection.targetType,
									"node-name": change[1].connection.target?.name,
									"is-active": unref(selectedDetailId) === change[1].connection.target?.id,
									"is-compact": "",
									onSelect: ($event) => unref(setSelectedDetailId)(change[1].connection.target?.id)
								}, null, 8, [
									"node-type",
									"node-name",
									"is-active",
									"onSelect"
								])
							])])]);
						}), 128)) : (openBlock(), createBlock(WorkflowDiffEmptyState_default, {
							key: 1,
							text: unref(i18n).baseText("workflowDiff.noChanges")
						}, null, 8, ["text"]))], 2)) : createCommentVNode("", true),
						unref(activeTab) === "settings" ? (openBlock(), createElementBlock("ul", {
							key: 2,
							class: normalizeClass(unref($style).settings)
						}, [unref(settingsDiff).length > 0 ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(unref(settingsDiff), (setting) => {
							return openBlock(), createElementBlock("li", { key: setting.name }, [createVNode(unref(N8nText_default), {
								color: "text-dark",
								size: "medium",
								tag: "div",
								bold: ""
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`workflowSettings.${setting.name}`)), 1)]),
								_: 2
							}, 1024), createVNode(NodeDiff_default, {
								"old-string": setting.before,
								"new-string": setting.after,
								class: normalizeClass(unref($style).noNumberDiff)
							}, null, 8, [
								"old-string",
								"new-string",
								"class"
							])]);
						}), 128)) : (openBlock(), createBlock(WorkflowDiffEmptyState_default, {
							key: 1,
							text: unref(i18n).baseText("workflowDiff.noChanges")
						}, null, 8, ["text"]))], 2)) : createCommentVNode("", true)
					])], 2)]),
					_: 1
				})]),
				_: 3
			}, 8, [
				"sync-is-enabled",
				"title",
				"hide-title",
				"show-back-button",
				"show-fullscreen-button",
				"is-fullscreen",
				"onPrevious",
				"onNext"
			]), createBaseVNode("div", {
				class: normalizeClass([unref($style).canvasArea, { [unref($style).focused]: __props.requireCanvasFocus && isCanvasFocused.value && !isFullscreen.value }]),
				"data-test-id": "workflow-diff-canvas-area"
			}, [createVNode(WorkflowDiffContent_default, {
				class: normalizeClass(unref($style).canvasContent),
				"source-nodes": unref(source).nodes,
				"source-connections": unref(source).connections,
				"source-render-data": unref(sourceRenderData),
				"target-nodes": unref(target).nodes,
				"target-connections": unref(target).connections,
				"target-render-data": unref(targetRenderData),
				"source-label": __props.sourceLabel,
				"target-label": __props.targetLabel,
				"source-exists": !!__props.sourceWorkflow,
				"target-exists": !!__props.targetWorkflow,
				"selected-node": unref(selectedNode),
				"node-diffs": unref(nodeDiffs),
				"is-source-workflow-new": unref(isSourceWorkflowNew),
				"apply-layout": __props.tidyUp,
				"nodes-diff": unref(nodesDiff),
				"connections-diff": unref(connectionsDiff),
				"canvas-id-prefix": __props.canvasIdPrefix,
				onCloseAside: _cache[3] || (_cache[3] = ($event) => selectedDetailId.value = void 0)
			}, createSlots({ _: 2 }, [
				_ctx.$slots.sourceLabel ? {
					name: "sourceLabel",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "sourceLabel")]),
					key: "0"
				} : void 0,
				_ctx.$slots.sourceEmptyText ? {
					name: "sourceEmptyText",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "sourceEmptyText")]),
					key: "1"
				} : void 0,
				_ctx.$slots.targetLabel ? {
					name: "targetLabel",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "targetLabel")]),
					key: "2"
				} : void 0,
				_ctx.$slots.targetEmptyText ? {
					name: "targetEmptyText",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "targetEmptyText")]),
					key: "3"
				} : void 0
			]), 1032, [
				"class",
				"source-nodes",
				"source-connections",
				"source-render-data",
				"target-nodes",
				"target-connections",
				"target-render-data",
				"source-label",
				"target-label",
				"source-exists",
				"target-exists",
				"selected-node",
				"node-diffs",
				"is-source-workflow-new",
				"apply-layout",
				"nodes-diff",
				"connections-diff",
				"canvas-id-prefix"
			]), !isWheelEnabled.value ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				size: "small",
				color: "text-light",
				class: normalizeClass(unref($style).focusHint)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.workflow.activateCanvas")), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true)], 2)], 42, _hoisted_1)], 8, ["disabled"]);
		};
	}
}), [["__cssModules", { "$style": {
	workflowDiffViewContainer: "_workflowDiffViewContainer_1vv32_3",
	canvasArea: "_canvasArea_1vv32_10",
	canvasContent: "_canvasContent_1vv32_16",
	focused: "_focused_1vv32_21",
	focusHint: "_focusHint_1vv32_32",
	fullscreen: "_fullscreen_1vv32_44",
	tabs: "_tabs_1vv32_51",
	changes: "_changes_1vv32_55",
	separator: "_separator_1vv32_67",
	circleBadge: "_circleBadge_1vv32_76",
	dropdownContent: "_dropdownContent_1vv32_90",
	settings: "_settings_1vv32_105",
	noNumberDiff: "_noNumberDiff_1vv32_111"
} }]]);
//#endregion
export { WorkflowDiffView_default as t };
