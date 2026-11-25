import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Ef as watchEffect, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, NM as N8nCard_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bN as N8nSpinner_default, hu as NodeIcon_default, id as useTemplatesStore, jN as useI18n, rx as EXPERIMENT_TEMPLATE_RECO_V3_KEY, uf as useNodeTypesStore, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as usePersonalizedTemplatesV3Store } from "./personalizedTemplatesV3.store-CgsWHP-W.js";
//#region src/experiments/personalizedTemplatesV3/components/TemplateCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var TemplateCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TemplateCard",
	props: { template: {} },
	setup(__props) {
		const props = __props;
		const nodeTypesStore = useNodeTypesStore();
		const { getTemplateRoute, trackTemplateClickFromModal } = usePersonalizedTemplatesV3Store();
		const router = useRouter();
		const uiStore = useUIStore();
		const templateNodes = computed(() => {
			if (!props.template?.nodes) return [];
			const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
			const nodeTypesArray = Array.from(uniqueNodeTypes);
			const nodesToShow = [];
			const hubspotNode = nodeTypesStore.getNodeType("n8n-nodes-base.hubspot");
			if (hubspotNode && uniqueNodeTypes.has("n8n-nodes-base.hubspot")) nodesToShow.push(hubspotNode);
			const otherNodes = nodeTypesArray.filter((nodeType) => nodeType !== "n8n-nodes-base.hubspot");
			if (otherNodes.length > 0) {
				const otherNodeType = nodeTypesStore.getNodeType(otherNodes[0]);
				if (otherNodeType) nodesToShow.push(otherNodeType);
			}
			return nodesToShow;
		});
		const cleanTitle = computed(() => {
			if (!props.template?.name) return "";
			return props.template.name.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
		});
		const cleanDescription = computed(() => {
			if (!props.template?.description) return "";
			return props.template.description.replace(/\*\*(.*?)\*\*/g, "<script setup lang=\"ts\">").replace(/\*(.*?)\*/g, "<script setup lang=\"ts\">").replace(/`(.*?)`/g, "<script setup lang=\"ts\">").replace(/!\[(.*?)\]\(.*?\)/g, "").replace(/\[(.*?)\]\(.*?\)/g, "<script setup lang=\"ts\">").replace(/#{1,6}\s/g, "").replace(/^\s*[-*+]\s/gm, "").replace(/^\s*\d+\.\s/gm, "").replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "").replace(/[\r\n\t\f\v]/g, " ").replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, " ").replace(/[\u200B-\u200D\uFEFF\uFE0F]/g, "").replace(/\s+/g, " ").trim();
		});
		const handleUseTemplate = async () => {
			trackTemplateClickFromModal(props.template.id);
			await router.push(getTemplateRoute(props.template.id));
			uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V3_KEY);
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass(_ctx.$style.suggestion),
				onClick: handleUseTemplate
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), {
					size: "medium",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(cleanTitle.value), 1)]),
					_: 1
				}), cleanDescription.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					class: normalizeClass([_ctx.$style.description, "mt-2xs"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(cleanDescription.value), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)], 2), templateNodes.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.nodes, "mt-m"])
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(templateNodes.value, (nodeType) => {
					return openBlock(), createElementBlock("div", {
						key: nodeType.name,
						class: normalizeClass(_ctx.$style.nodeIcon)
					}, [createVNode(NodeIcon_default, {
						size: 18,
						"stroke-width": 1.5,
						"node-type": nodeType
					}, null, 8, ["node-type"])], 2);
				}), 128))], 2)) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	nodes: "_nodes_1ibco_1",
	nodeIcon: "_nodeIcon_1ibco_6",
	remainingNodes: "_remainingNodes_1ibco_15",
	description: "_description_1ibco_20",
	suggestion: "_suggestion_1ibco_30",
	content: "_content_1ibco_45"
} }]]);
//#endregion
//#region src/experiments/personalizedTemplatesV3/components/NodeRecommendationModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 1 };
var NodeRecommendationModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeRecommendationModal",
	setup(__props) {
		const uiStore = useUIStore();
		const templatesStore = useTemplatesStore();
		const { getHubSpotData, getTemplateData, trackPersonalizationModalView, trackTemplatesRepoClickFromModal } = usePersonalizedTemplatesV3Store();
		const locale = useI18n();
		const closeModal = () => {
			uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V3_KEY);
		};
		const openTemplateRepository = () => {
			trackTemplatesRepoClickFromModal();
			window.open(templatesStore.websiteTemplateRepositoryURL, "_blank");
		};
		const templates = ref([]);
		const isLoadingTemplates = ref(false);
		watchEffect(async () => {
			trackPersonalizationModalView();
			isLoadingTemplates.value = true;
			try {
				const templatePromises = getHubSpotData().templates?.map(async (id) => await getTemplateData(id)) || [];
				const results = await Promise.allSettled(templatePromises);
				templates.value = results.filter((result) => result.status === "fulfilled" && result.value !== null).map((result) => result.value);
			} catch (error) {
				console.error("Error loading templates:", error);
			} finally {
				isLoadingTemplates.value = false;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: unref(EXPERIMENT_TEMPLATE_RECO_V3_KEY),
				"min-width": "min(800px, 90vw)",
				"max-height": "90vh",
				class: normalizeClass(_ctx.$style.modal),
				onClose: closeModal,
				onCanceled: closeModal
			}, {
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
					tag: "h1",
					size: "large",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("experiments.personalizedTemplatesV3.recommendedForYou")), 1)]),
					_: 1
				})], 2)]),
				content: withCtx(() => [isLoadingTemplates.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loading)
				}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), { size: "small" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("experiments.personalizedTemplatesV3.loadingTemplates")), 1)]),
					_: 1
				})], 2)) : (openBlock(), createElementBlock("div", _hoisted_1, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.templates) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(templates.value, (template) => {
					return openBlock(), createBlock(TemplateCard_default, {
						key: template.id,
						template
					}, null, 8, ["template"]);
				}), 128))], 2), createVNode(unref(N8nCard_default), {
					class: normalizeClass([_ctx.$style.footerCard]),
					onClick: openTemplateRepository
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footerContent) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footerText) }, [createVNode(unref(N8nText_default), {
						size: "medium",
						bold: true,
						class: "mr-s",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("experiments.personalizedTemplatesV3.couldntFind")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass("mt-2xs")
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("experiments.personalizedTemplatesV3.browseAllTemplates")), 1)]),
						_: 1
					})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.footerIcon) }, [createVNode(unref(N8nIcon_default), {
						icon: "external-link",
						size: "medium"
					})], 2)], 2)]),
					_: 1
				}, 8, ["class"])]))]),
				_: 1
			}, 8, ["name", "class"]);
		};
	}
}), [["__cssModules", { "$style": {
	modal: "_modal_jqnsd_1",
	header: "_header_jqnsd_5",
	templates: "_templates_jqnsd_10",
	loading: "_loading_jqnsd_17",
	footerCard: "_footerCard_jqnsd_26",
	footerContent: "_footerContent_jqnsd_37",
	footerText: "_footerText_jqnsd_43",
	footerIcon: "_footerIcon_jqnsd_48"
} }]]);
//#endregion
export { NodeRecommendationModal_default as default };
