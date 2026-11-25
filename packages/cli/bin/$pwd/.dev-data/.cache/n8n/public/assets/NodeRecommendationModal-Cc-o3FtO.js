import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Ef as watchEffect, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, NM as N8nCard_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bN as N8nSpinner_default, hM as N8nLink_default, hu as NodeIcon_default, id as useTemplatesStore, jN as useI18n, kj as N8nSegmentControl_default, nx as EXPERIMENT_TEMPLATE_RECO_V2_KEY, uf as useNodeTypesStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as usePersonalizedTemplatesV2Store } from "./templateRecoV2.store-36JTeaJm.js";
//#region src/experiments/templateRecoV2/components/TemplateCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var TemplateCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TemplateCard",
	props: {
		template: {},
		currentNodeName: {}
	},
	setup(__props) {
		const props = __props;
		const nodeTypesStore = useNodeTypesStore();
		const { getTemplateRoute, trackTemplateTileClick } = usePersonalizedTemplatesV2Store();
		const router = useRouter();
		const uiStore = useUIStore();
		const locale = useI18n();
		const templateNodes = computed(() => {
			if (!props.template?.nodes) return [];
			const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
			const nodeTypesArray = Array.from(uniqueNodeTypes);
			if (props.currentNodeName && uniqueNodeTypes.has(props.currentNodeName)) {
				const otherNodes = nodeTypesArray.filter((nodeType) => nodeType !== props.currentNodeName);
				const nodesToShow = [props.currentNodeName];
				if (otherNodes.length > 0) nodesToShow.push(otherNodes[0]);
				return nodesToShow.map((nodeType) => nodeTypesStore.getNodeType(nodeType)).filter(Boolean);
			}
			return nodeTypesArray.slice(0, 2).map((nodeType) => nodeTypesStore.getNodeType(nodeType)).filter(Boolean);
		});
		const handleUseTemplate = async () => {
			trackTemplateTileClick(props.template.id);
			await router.push(getTemplateRoute(props.template.id));
			uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V2_KEY);
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.suggestion) }, {
				default: withCtx(() => [createBaseVNode("div", null, [templateNodes.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.nodes, "mb-s"])
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(templateNodes.value, (nodeType) => {
					return openBlock(), createElementBlock("div", {
						key: nodeType.name,
						class: normalizeClass(_ctx.$style.nodeIcon)
					}, [createVNode(NodeIcon_default, {
						size: 18,
						"stroke-width": 1.5,
						"node-type": nodeType
					}, null, 8, ["node-type"])], 2);
				}), 128))], 2)) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
					size: "medium",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.template.name), 1)]),
					_: 1
				})]), createBaseVNode("div", { class: normalizeClass([_ctx.$style.actions, "mt-m"]) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					label: unref(locale).baseText("workflows.templateRecoV2.useTemplate"),
					size: "xsmall",
					onClick: handleUseTemplate
				}, null, 8, ["label"])], 2)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	nodes: "_nodes_1yv6a_1",
	nodeIcon: "_nodeIcon_1yv6a_6",
	suggestion: "_suggestion_1yv6a_17",
	actions: "_actions_1yv6a_24",
	user: "_user_1yv6a_30",
	avatar: "_avatar_1yv6a_36"
} }]]);
//#endregion
//#region src/experiments/templateRecoV2/components/YoutubeCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["src"];
var YoutubeCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "YoutubeCard",
	props: {
		videoId: {},
		title: {},
		description: {}
	},
	setup(__props) {
		const props = __props;
		const { trackVideoClick } = usePersonalizedTemplatesV2Store();
		const openYouTubeVideo = () => {
			trackVideoClick(props.title);
			window.open(`https://www.youtube.com/watch?v=${props.videoId}`, "_blank");
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				hoverable: "",
				onClick: openYouTubeVideo
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tutorial) }, [createBaseVNode("img", {
					src: `https://img.youtube.com/vi/${props.videoId}/hq720.jpg`,
					width: "250px",
					class: normalizeClass(_ctx.$style.video)
				}, null, 10, _hoisted_1), createBaseVNode("div", null, [createVNode(unref(N8nText_default), {
					tag: "h2",
					size: "large",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.title), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					tag: "h3",
					size: "small",
					class: "mt-2xs"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.description), 1)]),
					_: 1
				})])], 2)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	tutorial: "_tutorial_1bouj_1",
	video: "_video_1bouj_7"
} }]]);
//#endregion
//#region src/experiments/templateRecoV2/components/NodeRecommendationModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var NodeRecommendationModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeRecommendationModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const uiStore = useUIStore();
		const { nodes: userSelectedNodes, getNodeData, getTemplateData, trackModalTabView, trackSeeMoreClick } = usePersonalizedTemplatesV2Store();
		const nodeTypesStore = useNodeTypesStore();
		const templatesStore = useTemplatesStore();
		const locale = useI18n();
		const closeModal = () => {
			uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V2_KEY);
		};
		const selectedNode = ref(props.data.nodeName ?? userSelectedNodes[0] ?? "");
		const starterTemplates = ref([]);
		const popularTemplates = ref([]);
		const isLoadingTemplates = ref(false);
		const nodes = computed(() => userSelectedNodes.map((nodeName) => {
			return {
				value: nodeName,
				label: nodeTypesStore.getNodeType(nodeName)?.displayName ?? ""
			};
		}));
		const nodeTypes = computed(() => new Map(userSelectedNodes.map((nodeName) => [nodeName, nodeTypesStore.getNodeType(nodeName)])));
		const currentNodeData = computed(() => {
			return getNodeData(selectedNode.value);
		});
		const youtubeVideos = computed(() => {
			return currentNodeData.value.youtube || [];
		});
		const starterLink = computed(() => {
			const name = nodeTypes.value.get(selectedNode.value)?.displayName ?? "";
			const params = new URLSearchParams(templatesStore.websiteTemplateRepositoryParameters);
			params.set("integrations", name);
			params.set("q", "Simple");
			return templatesStore.constructTemplateRepositoryURL(params);
		});
		const popularLink = computed(() => {
			const name = nodeTypes.value.get(selectedNode.value)?.displayName ?? "";
			const params = new URLSearchParams(templatesStore.websiteTemplateRepositoryParameters);
			params.set("integrations", name);
			return templatesStore.constructTemplateRepositoryURL(params);
		});
		function onSelectedNodeChange(val) {
			selectedNode.value = val;
		}
		watchEffect(async () => {
			if (!selectedNode.value) return;
			const nodeDisplayName = nodes.value.find((n) => n.value === selectedNode.value)?.label;
			if (nodeDisplayName) trackModalTabView(nodeDisplayName);
			isLoadingTemplates.value = true;
			try {
				const nodeData = getNodeData(selectedNode.value);
				const starterPromises = nodeData.starter?.map(async (id) => await getTemplateData(id)) || [];
				const popularPromises = nodeData.popular?.map(async (id) => await getTemplateData(id)) || [];
				const [starterResults, popularResults] = await Promise.all([Promise.allSettled(starterPromises), Promise.allSettled(popularPromises)]);
				starterTemplates.value = starterResults.filter((result) => result.status === "fulfilled" && result.value !== null).map((result) => result.value);
				popularTemplates.value = popularResults.filter((result) => result.status === "fulfilled" && result.value !== null).map((result) => result.value);
			} catch (error) {
				console.error("Error loading templates:", error);
			} finally {
				isLoadingTemplates.value = false;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: unref(EXPERIMENT_TEMPLATE_RECO_V2_KEY),
				"min-width": "min(800px, 90vw)",
				"max-height": "90vh",
				onClose: closeModal,
				onCanceled: closeModal
			}, {
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nSegmentControl_default), {
					modelValue: selectedNode.value,
					"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => selectedNode.value = $event), onSelectedNodeChange],
					options: nodes.value
				}, {
					option: withCtx((option) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tab) }, [createVNode(NodeIcon_default, {
						size: 18,
						class: normalizeClass(_ctx.$style.nodeIcon),
						"stroke-width": 1.5,
						"node-type": nodeTypes.value.get(option.value)
					}, null, 8, ["class", "node-type"])], 2)]),
					_: 1
				}, 8, ["modelValue", "options"])], 2)]),
				content: withCtx(() => [
					createBaseVNode("div", { class: normalizeClass([_ctx.$style.title, "mb-m"]) }, [createVNode(unref(N8nText_default), {
						tag: "h2",
						size: "large",
						bold: true
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.templateRecoV2.starterTemplates")), 1)]),
						_: 1
					}), createVNode(unref(N8nLink_default), {
						href: starterLink.value,
						onClick: _cache[1] || (_cache[1] = ($event) => unref(trackSeeMoreClick)("starter"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.templateRecoV2.seeMoreStarterTemplates")), 1)]),
						_: 1
					}, 8, ["href"])], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.suggestions) }, [isLoadingTemplates.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.loading)
					}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.templateRecoV2.loadingTemplates")), 1)]),
						_: 1
					})], 2)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(starterTemplates.value, (template) => {
						return openBlock(), createBlock(TemplateCard_default, {
							key: template.id,
							template,
							"current-node-name": selectedNode.value
						}, null, 8, ["template", "current-node-name"]);
					}), 128))], 2),
					createBaseVNode("div", { class: normalizeClass([_ctx.$style.title, "mb-m mt-m"]) }, [createVNode(unref(N8nText_default), {
						tag: "h2",
						size: "large",
						bold: true
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.templateRecoV2.popularTemplates")), 1)]),
						_: 1
					}), createVNode(unref(N8nLink_default), {
						href: popularLink.value,
						onClick: _cache[2] || (_cache[2] = ($event) => unref(trackSeeMoreClick)("popular"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.templateRecoV2.seeMorePopularTemplates")), 1)]),
						_: 1
					}, 8, ["href"])], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.suggestions) }, [isLoadingTemplates.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.loading)
					}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.templateRecoV2.loadingTemplates")), 1)]),
						_: 1
					})], 2)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(popularTemplates.value, (template) => {
						return openBlock(), createBlock(TemplateCard_default, {
							key: template.id,
							template,
							"current-node-name": selectedNode.value
						}, null, 8, ["template", "current-node-name"]);
					}), 128))], 2),
					createVNode(unref(N8nText_default), {
						tag: "h2",
						size: "large",
						bold: true,
						class: "mb-m mt-m"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("workflows.templateRecoV2.tutorials")), 1)]),
						_: 1
					}),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.videos) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(youtubeVideos.value, (video) => {
						return openBlock(), createBlock(YoutubeCard_default, {
							key: video.id,
							"video-id": video.id,
							title: video.title,
							description: video.description
						}, null, 8, [
							"video-id",
							"title",
							"description"
						]);
					}), 128))], 2)
				]),
				_: 1
			}, 8, ["name"]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1kjeh_1",
	tab: "_tab_1kjeh_6",
	suggestions: "_suggestions_1kjeh_10",
	title: "_title_1kjeh_18",
	videos: "_videos_1kjeh_25",
	loading: "_loading_1kjeh_32"
} }]]);
//#endregion
export { NodeRecommendationModal_default as default };
