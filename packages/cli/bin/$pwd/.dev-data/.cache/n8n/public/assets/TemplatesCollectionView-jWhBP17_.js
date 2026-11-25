import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Im as filterTemplateNodes, Kd as useDocumentTitle, Nf as isFullTemplatesCollection, Pf as isTemplatesWorkflow, Qj as N8nMarkdown_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, _j as N8nTags_default, fC as VIEWS, hC as useTelemetry, hu as NodeIcon_default, id as useTemplatesStore, jN as useI18n, sy as abbreviateNumber, tN as N8nLoading_default, uf as useNodeTypesStore, vd as useExternalHooks, yu as TimeAgo_default } from "./app-D5flEmb-.js";
import { n as useTemplateWorkflow } from "./templateActions-C_h7h5KM.js";
import { t as TemplatesView_default } from "./TemplatesView-CckMvSwx.js";
import { t as TemplateList_default } from "./TemplateList-BDkc2buR.js";
//#region src/features/workflows/templates/components/TemplateDetailsBlock.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var TemplateDetailsBlock_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TemplateDetailsBlock",
	props: { title: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.block) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nHeading_default), {
				tag: "h3",
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
				_: 1
			})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [renderSlot(_ctx.$slots, "default")], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	block: "_block_3mtz1_1",
	header: "_header_3mtz1_5",
	content: "_content_3mtz1_10"
} }]]);
//#endregion
//#region src/features/workflows/templates/components/TemplateDetails.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var TemplateDetails_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TemplateDetails",
	props: {
		template: {},
		blockTitle: {},
		loading: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const router = useRouter();
		const i18n = useI18n();
		const templatesStore = useTemplatesStore();
		const categoriesAsTags = computed(() => props.template && "categories" in props.template ? props.template.categories.map((category) => ({
			id: `${category.id}`,
			name: category.name
		})) : []);
		const redirectToCategory = (id) => {
			templatesStore.resetSessionId();
			router.push(`/templates?categories=${id}`);
		};
		const redirectToSearchPage = (node) => {
			templatesStore.resetSessionId();
			router.push(`/templates?search=${node.displayName}`);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createVNode(unref(N8nLoading_default), {
					loading: __props.loading,
					rows: 5,
					variant: "p"
				}, null, 8, ["loading"]),
				!__props.loading && __props.template && __props.template.nodes.length > 0 ? (openBlock(), createBlock(TemplateDetailsBlock_default, {
					key: 0,
					title: __props.blockTitle
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.icons) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(filterTemplateNodes)(__props.template.nodes), (node) => {
						return openBlock(), createElementBlock("div", {
							key: node.name,
							class: normalizeClass(_ctx.$style.icon)
						}, [createVNode(NodeIcon_default, {
							"node-type": node,
							size: 24,
							"show-tooltip": true,
							onClick: ($event) => redirectToSearchPage(node)
						}, null, 8, ["node-type", "onClick"])], 2);
					}), 128))], 2)]),
					_: 1
				}, 8, ["title"])) : createCommentVNode("", true),
				!__props.loading && unref(isFullTemplatesCollection)(__props.template) && categoriesAsTags.value.length > 0 ? (openBlock(), createBlock(TemplateDetailsBlock_default, {
					key: 1,
					title: unref(i18n).baseText("template.details.categories")
				}, {
					default: withCtx(() => [createVNode(unref(N8nTags_default), {
						tags: categoriesAsTags.value,
						"onClick:tag": redirectToCategory
					}, null, 8, ["tags"])]),
					_: 1
				}, 8, ["title"])) : createCommentVNode("", true),
				!__props.loading && __props.template ? (openBlock(), createBlock(TemplateDetailsBlock_default, {
					key: 2,
					title: unref(i18n).baseText("template.details.details")
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.text) }, [unref(isTemplatesWorkflow)(__props.template) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [
							createTextVNode(toDisplayString(unref(i18n).baseText("template.details.created")) + " ", 1),
							createVNode(TimeAgo_default, { date: __props.template.createdAt }, null, 8, ["date"]),
							createTextVNode(" " + toDisplayString(unref(i18n).baseText("template.details.by")) + " " + toDisplayString(__props.template.user ? __props.template.user.username : "n8n team"), 1)
						]),
						_: 1
					})) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.text) }, [unref(isTemplatesWorkflow)(__props.template) && __props.template.totalViews !== 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("template.details.viewed")) + " " + toDisplayString(unref(abbreviateNumber)(__props.template.totalViews)) + " " + toDisplayString(unref(i18n).baseText("template.details.times")), 1)]),
						_: 1
					})) : createCommentVNode("", true)], 2)]),
					_: 1
				}, 8, ["title"])) : createCommentVNode("", true)
			]);
		};
	}
}), [["__cssModules", { "$style": {
	icons: "_icons_cf0ze_1",
	icon: "_icon_cf0ze_1",
	text: "_text_cf0ze_12"
} }]]);
//#endregion
//#region src/features/workflows/templates/views/TemplatesCollectionView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var TemplatesCollectionView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TemplatesCollectionView",
	setup(__props) {
		const externalHooks = useExternalHooks();
		const templatesStore = useTemplatesStore();
		const nodeTypesStore = useNodeTypesStore();
		const route = useRoute();
		const router = useRouter();
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const documentTitle = useDocumentTitle();
		const loading = ref(true);
		const notFoundError = ref(false);
		const collectionId = computed(() => {
			const { id } = route.params;
			return Array.isArray(id) ? id[0] : id;
		});
		const collection = computed(() => templatesStore.getCollectionById[collectionId.value]);
		const collectionWorkflows = computed(() => {
			if (!collection.value || loading.value) return [];
			return collection.value.workflows.map(({ id }) => templatesStore.getTemplatesById(id.toString())).filter((workflow) => !!workflow);
		});
		const scrollToTop = () => {
			setTimeout(() => {
				const contentArea = document.getElementById("content");
				if (contentArea) contentArea.scrollTo({
					top: 0,
					behavior: "smooth"
				});
			}, 50);
		};
		const onOpenTemplate = ({ event, id }) => {
			navigateTo(event, VIEWS.TEMPLATE, `${id}`);
		};
		const onUseWorkflow = async ({ event, id }) => {
			await useTemplateWorkflow({
				router,
				templateId: `${id}`,
				inNewBrowserTab: event.metaKey || event.ctrlKey,
				templatesStore,
				externalHooks,
				nodeTypesStore,
				telemetry,
				source: "template_list"
			});
		};
		const navigateTo = (e, page, id) => {
			if (e.metaKey || e.ctrlKey) {
				const { href } = router.resolve({
					name: page,
					params: { id }
				});
				window.open(href, "_blank");
				return;
			} else router.push({
				name: page,
				params: { id }
			});
		};
		watch(() => collection.value, () => {
			if (collection.value && "full" in collection.value && collection.value.full) documentTitle.set(`Template collection: ${collection.value.name}`);
			else documentTitle.set("Templates");
		});
		onMounted(async () => {
			scrollToTop();
			if (collection.value && "full" in collection.value && collection.value.full) {
				loading.value = false;
				return;
			}
			try {
				await templatesStore.fetchCollectionById(collectionId.value);
			} catch (e) {
				notFoundError.value = true;
			}
			loading.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(TemplatesView_default, { "go-back-enabled": true }, createSlots({
				header: withCtx(() => [!notFoundError.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.wrapper)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.title) }, [
					collection.value && collection.value.name ? (openBlock(), createBlock(unref(N8nHeading_default), {
						key: 0,
						tag: "h1",
						size: "2xlarge"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(collection.value.name), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					collection.value && collection.value.name ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-base",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("templates.collection")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(N8nLoading_default), {
						loading: !collection.value || !collection.value.name,
						rows: 2,
						variant: "h1"
					}, null, 8, ["loading"])
				], 2)], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.notFound)
				}, [createVNode(unref(N8nText_default), { color: "text-base" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("templates.collectionsNotFound")), 1)]),
					_: 1
				})], 2))]),
				_: 2
			}, [!notFoundError.value ? {
				name: "content",
				fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.wrapper) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.mainContent) }, [loading.value || unref(isFullTemplatesCollection)(collection.value) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.markdown)
				}, [createVNode(unref(N8nMarkdown_default), {
					content: unref(isFullTemplatesCollection)(collection.value) && collection.value.description ? collection.value.description : "",
					images: unref(isFullTemplatesCollection)(collection.value) && collection.value.image ? collection.value.image : void 0,
					loading: loading.value
				}, null, 8, [
					"content",
					"images",
					"loading"
				])], 2)) : createCommentVNode("", true), createVNode(TemplateList_default, {
					"infinite-scroll-enabled": false,
					loading: loading.value,
					"use-workflow-button": true,
					workflows: collectionWorkflows.value,
					onUseWorkflow,
					onOpenTemplate
				}, null, 8, ["loading", "workflows"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.details) }, [createVNode(TemplateDetails_default, {
					"block-title": unref(i18n).baseText("template.details.appsInTheCollection"),
					loading: loading.value,
					template: collection.value
				}, null, 8, [
					"block-title",
					"loading",
					"template"
				])], 2)], 2)]),
				key: "0"
			} : void 0]), 1024);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_1gsgb_1",
	notFound: "_notFound_1gsgb_11",
	title: "_title_1gsgb_15",
	button: "_button_1gsgb_19",
	mainContent: "_mainContent_1gsgb_23",
	markdown: "_markdown_1gsgb_34",
	details: "_details_1gsgb_38"
} }]]);
//#endregion
export { TemplatesCollectionView_default as default };
