import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, pd as useDebounceFn, pr as require_uniqBy, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Im as filterTemplateNodes, Jg as useUIStore, Kd as useDocumentTitle, SN as _plugin_vue_export_helper_default, bN as N8nSpinner_default, eC as DEBOUNCE_TIME, hu as NodeIcon_default, jN as useI18n, uf as useNodeTypesStore, xN as N8nIcon_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { n as quickStartWorkflows, t as useResourceCenterStore } from "./resourceCenter.store-CqSzt_bm.js";
//#region src/experiments/resourceCenter/components/ResourceCard.vue?vue&type=script&setup=true&lang.ts
var import_uniqBy = /* @__PURE__ */ __toESM(require_uniqBy(), 1);
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = ["onKeydown", "onKeyup"];
var _hoisted_2 = { key: 0 };
var _hoisted_3 = { key: 2 };
var ResourceCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ResourceCard",
	props: { item: {} },
	emits: ["click"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const emitClick = () => emit("click");
		const onCardKeyActivate = (event) => {
			if (event.target !== event.currentTarget) return;
			emitClick();
		};
		const tagLabel = computed(() => props.item.type === "video" ? i18n.baseText("experiments.resourceCenter.badge.video") : i18n.baseText("experiments.resourceCenter.badge.template"));
		const resolvedTemplateNodeTypes = computed(() => {
			if (props.item.type !== "template" || !props.item.nodeTypes?.length) return [];
			const allResolved = props.item.nodeTypes.map((type) => nodeTypesStore.getNodeType(type)).filter((nodeType) => nodeType !== null && nodeType !== void 0);
			const seenNodeNames = /* @__PURE__ */ new Set();
			return allResolved.filter((nodeType) => {
				if (seenNodeNames.has(nodeType.name)) return false;
				seenNodeNames.add(nodeType.name);
				return true;
			});
		});
		const visibleNodeTypes = computed(() => resolvedTemplateNodeTypes.value.slice(0, 3));
		const remainingNodeTypeCount = computed(() => Math.max(0, resolvedTemplateNodeTypes.value.length - visibleNodeTypes.value.length));
		const videoSourceLabel = computed(() => {
			if (props.item.type !== "video") return "";
			if (!props.item.url) return "youtube.com";
			try {
				return new URL(props.item.url).hostname.replace(/^www\./, "");
			} catch {
				return props.item.url;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("article", {
				class: normalizeClass(_ctx.$style.card),
				role: "button",
				tabindex: "0",
				"data-testid": "resource-card",
				onClick: emitClick,
				onKeydown: withKeys(withModifiers(onCardKeyActivate, ["prevent"]), ["enter"]),
				onKeyup: withKeys(withModifiers(onCardKeyActivate, ["prevent"]), ["space"])
			}, [
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.tag),
					"data-testid": "resource-card-badge"
				}, toDisplayString(tagLabel.value), 3),
				createBaseVNode("h3", {
					class: normalizeClass(_ctx.$style.title),
					"data-testid": "resource-card-title"
				}, toDisplayString(__props.item.title), 3),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.footer),
					"data-testid": "resource-card-metadata"
				}, [createBaseVNode("p", { class: normalizeClass(_ctx.$style.meta) }, [__props.item.type === "video" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(videoSourceLabel.value), 1)], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					__props.item.setupTime ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(__props.item.setupTime), 1)) : createCommentVNode("", true),
					__props.item.setupTime && __props.item.nodeCount ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.separator)
					}, "•", 2)) : createCommentVNode("", true),
					__props.item.nodeCount ? (openBlock(), createElementBlock("span", _hoisted_3, toDisplayString(unref(i18n).baseText("experiments.resourceCenter.sandbox.nodes", { interpolate: { count: String(__props.item.nodeCount) } })), 1)) : createCommentVNode("", true)
				], 64))], 2), visibleNodeTypes.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.iconStack)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(visibleNodeTypes.value, (nodeType, index) => {
					return openBlock(), createElementBlock("span", {
						key: nodeType.name,
						class: normalizeClass(_ctx.$style.iconBubble),
						style: normalizeStyle({ zIndex: String(visibleNodeTypes.value.length - index + 1) })
					}, [createVNode(NodeIcon_default, {
						"node-type": nodeType,
						size: 12,
						circle: true
					}, null, 8, ["node-type"])], 6);
				}), 128)), remainingNodeTypeCount.value > 0 ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.countBubble),
					style: { zIndex: "1" }
				}, " +" + toDisplayString(remainingNodeTypeCount.value), 3)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2)
			], 42, _hoisted_1$2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_fv3x0_1",
	tag: "_tag_fv3x0_24",
	title: "_title_fv3x0_39",
	footer: "_footer_fv3x0_52",
	meta: "_meta_fv3x0_60",
	separator: "_separator_fv3x0_71",
	iconStack: "_iconStack_fv3x0_75",
	iconBubble: "_iconBubble_fv3x0_83",
	countBubble: "_countBubble_fv3x0_84"
} }]]);
//#endregion
//#region src/experiments/resourceCenter/components/ResourceFeatureCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["onKeydown", "onKeyup"];
var ResourceFeatureCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ResourceFeatureCard",
	props: {
		item: {},
		tone: {}
	},
	emits: ["click"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const toneClass = computed(() => props.tone === "amber" ? "toneAmber" : "toneRose");
		const isDarkTheme = computed(() => uiStore.appliedTheme === "dark");
		const emitClick = () => emit("click");
		const onCardKeyActivate = (event) => {
			if (event.target !== event.currentTarget) return;
			emitClick();
		};
		const resolvedArtworkNodeTypes = computed(() => {
			if (!props.item.nodeTypes?.length) return [];
			const seenNodeNames = /* @__PURE__ */ new Set();
			return props.item.nodeTypes.map((type) => nodeTypesStore.getNodeType(type)).filter((nodeType) => {
				if (nodeType === null || nodeType === void 0 || seenNodeNames.has(nodeType.name)) return false;
				seenNodeNames.add(nodeType.name);
				return true;
			}).slice(0, 4);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("article", {
				class: normalizeClass([
					_ctx.$style.card,
					_ctx.$style[toneClass.value],
					{ [_ctx.$style.dark]: isDarkTheme.value }
				]),
				role: "button",
				tabindex: "0",
				"data-testid": "resource-feature-card",
				onClick: emitClick,
				onKeydown: withKeys(withModifiers(onCardKeyActivate, ["prevent"]), ["enter"]),
				onKeyup: withKeys(withModifiers(onCardKeyActivate, ["prevent"]), ["space"])
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.copy) }, [createBaseVNode("h2", { class: normalizeClass(_ctx.$style.title) }, toDisplayString(__props.item.title), 3), createBaseVNode("p", { class: normalizeClass(_ctx.$style.subtitle) }, toDisplayString(unref(i18n).baseText("templates.card.readyToRun")), 3)], 2), createBaseVNode("button", {
				type: "button",
				class: normalizeClass(_ctx.$style.runButton),
				onClick: withModifiers(emitClick, ["stop"])
			}, [createVNode(unref(N8nIcon_default), {
				icon: "play",
				size: "xsmall"
			}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("ndv.output.run")), 1)], 2)], 2), createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.artwork),
				"aria-hidden": "true"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(resolvedArtworkNodeTypes.value, (nodeType, index) => {
				return openBlock(), createElementBlock("div", {
					key: nodeType.name,
					class: normalizeClass([_ctx.$style.artTile, _ctx.$style[`artTile${index + 1}`]])
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tileInner) }, [createVNode(NodeIcon_default, {
					"node-type": nodeType,
					size: index === 0 ? 64 : 58
				}, null, 8, ["node-type", "size"])], 2)], 2);
			}), 128))], 2)], 42, _hoisted_1$1);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_gg6wh_1",
	dark: "_dark_gg6wh_49",
	toneAmber: "_toneAmber_gg6wh_56",
	content: "_content_gg6wh_65",
	copy: "_copy_gg6wh_76",
	title: "_title_gg6wh_82",
	subtitle: "_subtitle_gg6wh_95",
	runButton: "_runButton_gg6wh_102",
	artwork: "_artwork_gg6wh_123",
	artTile: "_artTile_gg6wh_130",
	tileInner: "_tileInner_gg6wh_142",
	artTile1: "_artTile1_gg6wh_150",
	artTile2: "_artTile2_gg6wh_158",
	artTile3: "_artTile3_gg6wh_166",
	artTile4: "_artTile4_gg6wh_174"
} }]]);
//#endregion
//#region src/experiments/resourceCenter/data/resourceCenterData.ts
var getTemplateIds = (items) => items.flatMap((item) => item.type === "template" ? [item.templateId] : []);
var getInspiredContent = [
	{
		type: "template",
		templateId: 10427,
		title: "Analyse Facebook Ads automatically"
	},
	{
		type: "video",
		videoId: "jPea9Sp9xYQ",
		title: "OpenClaw clone in n8n",
		description: "Building an Open Claw Clone in n8n"
	},
	{
		type: "template",
		templateId: 7639,
		title: "Chat with your Google Sheet"
	},
	{
		type: "video",
		videoId: "A0OwvNOLNlw",
		title: "Whatsapp based AI agent",
		description: "Build an AI agent that works through WhatsApp",
		duration: "7 min"
	},
	{
		type: "template",
		templateId: 3050,
		title: "AI data analyst chatbot"
	},
	{
		type: "template",
		templateId: 4966,
		title: "Support WhatsApp bot with Google Docs knowledge base"
	},
	{
		type: "video",
		videoId: "k3mcttDLJB4",
		title: "Voice Agent",
		description: "Create a voice-powered AI agent",
		duration: "28 min"
	},
	{
		type: "template",
		templateId: 7177,
		title: "Inventory alerts for low stock & expiring"
	},
	{
		type: "video",
		videoId: "h7BLVKh7yzc",
		title: "Build an Outlook inbox manager",
		description: "Automate your email management with Outlook integration",
		duration: "32 min"
	},
	{
		type: "template",
		templateId: 8779,
		title: "Self Improving Email AI Support with Human in the Loop"
	},
	{
		type: "template",
		templateId: 3100,
		title: "Analyze Landing Page to get Optimization Tips"
	}
];
var learnContent = [
	{
		type: "template",
		templateId: 8527,
		title: "n8n basics in 3 easy steps"
	},
	{
		type: "video",
		videoId: "ZHH3sr234zY",
		title: "Build AI Agents & Automate Workflows (Masterclass)",
		description: "Comprehensive masterclass on building AI agents with n8n",
		duration: "1h 32 min",
		level: "Masterclass"
	},
	{
		type: "video",
		videoId: "4cQWJViybAQ",
		title: "Build your first workflow",
		description: "Get started with n8n by building your first workflow from scratch",
		duration: "15 min",
		level: "Beginner"
	},
	{
		type: "video",
		videoId: "OCO3aq3G0mk",
		title: "Get Claude to build workflows",
		description: "Build workflow from Claude directly in n8n using MCP and skills"
	},
	{
		type: "template",
		templateId: 6270,
		title: "Build your first AI agent"
	},
	{
		type: "video",
		videoId: "UIf-SlmMays",
		title: "Zero to Hero (Masterclass)",
		description: "Complete journey from beginner to advanced n8n user",
		duration: "3h 35 min",
		level: "Masterclass"
	},
	{
		type: "video",
		videoId: "kkrA7tGHYNo",
		title: "Basic workflow concepts",
		description: "Learn the fundamental concepts of n8n workflows",
		duration: "14 min",
		level: "Beginner"
	},
	{
		type: "video",
		videoId: "D9MIGseFB3g",
		title: "Essential nodes with use cases",
		description: "Learn the most important nodes and when to use them",
		duration: "24 min",
		level: "Masterclass"
	},
	{
		type: "video",
		videoId: "rCPXBkeBWCQ",
		title: "Nodes",
		description: "Understanding how nodes work in n8n workflows",
		duration: "13 min",
		level: "Beginner"
	},
	{
		type: "video",
		videoId: "zMy5yoA-ub8",
		title: "25 Tips & Tricks",
		description: "Power user tips and tricks to boost your productivity",
		duration: "15 min",
		level: "Masterclass"
	},
	{
		type: "video",
		videoId: "a5sJNwfZ528",
		title: "Using the AI workflow builder",
		description: "Learn how to use AI to build workflows faster",
		duration: "18 min",
		level: "Beginner"
	},
	{
		type: "video",
		videoId: "zcNB8L4_9mA",
		title: "Use test data (Pinning)",
		description: "Learn how to use pinning to test your workflows with sample data",
		duration: "7 min",
		level: "Beginner"
	},
	{
		type: "video",
		videoId: "kvEGWVMo-2c",
		title: "Connect any API with HTTP node",
		description: "Master API integrations using the HTTP Request node",
		duration: "5 min",
		level: "Intermediate"
	},
	{
		type: "video",
		videoId: "Gxe_RfCRH-o",
		title: "Fixing issues (Debugging)",
		description: "Learn how to debug and fix issues in your workflows",
		duration: "16 min",
		level: "Intermediate"
	},
	{
		type: "video",
		videoId: "bTF3tACqPRU",
		title: "Handling errors",
		description: "Set up error handling to make your workflows more robust",
		duration: "10 min",
		level: "Intermediate"
	}
];
var featuredTemplateIds = getTemplateIds(getInspiredContent);
var learnTemplateIds = getTemplateIds(learnContent);
//#endregion
//#region src/experiments/resourceCenter/views/ResourceCenterView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["value", "placeholder"];
var ResourceCenterView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ResourceCenterView",
	setup(__props) {
		const READY_TO_RUN_ARTWORK_EXCLUDED_TYPES = /* @__PURE__ */ new Set([
			"n8n-nodes-base.stickyNote",
			"n8n-nodes-base.manualTrigger",
			"n8n-nodes-base.set",
			"@n8n/n8n-nodes-langchain.memoryBufferWindow"
		]);
		const DEPRIORITIZED_TEMPLATE_CARD_NODE_PREFIXES = ["@n8n/n8n-nodes-langchain."];
		const i18n = useI18n();
		const router = useRouter();
		const uiStore = useUIStore();
		const resourceCenterStore = useResourceCenterStore();
		const featuredTemplates = ref([]);
		const learnTemplates = ref([]);
		const isLoading = ref(false);
		const searchQuery = ref("");
		const debouncedSearch = ref("");
		const searchPlaceholder = computed(() => i18n.baseText("experiments.resourceCenter.search.placeholder"));
		const isDarkTheme = computed(() => uiStore.appliedTheme === "dark");
		const onSearchInput = useDebounceFn((value) => {
			debouncedSearch.value = value;
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		const handleSearchInput = (event) => {
			if (!(event.target instanceof HTMLInputElement)) return;
			searchQuery.value = event.target.value;
			onSearchInput(event.target.value);
		};
		const matchesSearch = (item) => {
			if (!debouncedSearch.value) return true;
			return item.title.toLowerCase().includes(debouncedSearch.value.toLowerCase());
		};
		const filterItems = (items) => items.filter(matchesSearch);
		const getTemplateCardNodeTypes = (template) => {
			const filteredNodes = filterTemplateNodes(template.nodes ?? []);
			const preferredNodes = filteredNodes.filter((node) => !DEPRIORITIZED_TEMPLATE_CARD_NODE_PREFIXES.some((prefix) => node.name.startsWith(prefix)));
			const fallbackNodes = filteredNodes.filter((node) => DEPRIORITIZED_TEMPLATE_CARD_NODE_PREFIXES.some((prefix) => node.name.startsWith(prefix)));
			return (0, import_uniqBy.default)([...preferredNodes, ...fallbackNodes], (node) => node.icon).map((node) => node.name).filter((nodeName) => nodeName !== "");
		};
		const buildTemplateResourceItem = (template, section, title) => {
			const nodeCount = template.workflowInfo.nodeCount;
			return {
				id: template.id,
				type: "template",
				title,
				description: template.description ?? "",
				section,
				templateId: template.id,
				nodeTypes: getTemplateCardNodeTypes(template),
				nodeCount,
				setupTime: `${Math.max(5, Math.ceil(nodeCount / 3 * 5))} min`
			};
		};
		const buildOrderedSectionItems = (content, templatesById, section) => content.flatMap((entry) => {
			if (entry.type === "video") return [{
				id: entry.videoId,
				type: "video",
				title: entry.title,
				description: entry.description,
				section,
				videoId: entry.videoId,
				url: entry.url,
				duration: entry.duration,
				level: entry.level
			}];
			const template = templatesById.get(entry.templateId);
			return template ? [buildTemplateResourceItem(template, section, entry.title)] : [];
		});
		const featuredTemplatesById = computed(() => new Map(featuredTemplates.value.map((template) => [template.id, template])));
		const learnTemplatesById = computed(() => new Map(learnTemplates.value.map((template) => [template.id, template])));
		const getStartedItems = computed(() => quickStartWorkflows.map((workflow) => ({
			id: workflow.id,
			type: "ready-to-run",
			title: workflow.name,
			description: workflow.description,
			section: "quick-start",
			quickStartId: workflow.id,
			nodeTypes: [...new Set(workflow.workflow.nodes?.map((node) => node.type) ?? workflow.nodeTypes)].filter((nodeType) => !READY_TO_RUN_ARTWORK_EXCLUDED_TYPES.has(nodeType)),
			nodeCount: workflow.nodeCount
		})));
		const getInspiredItems = computed(() => buildOrderedSectionItems(getInspiredContent, featuredTemplatesById.value, "inspiration"));
		const learnItems = computed(() => buildOrderedSectionItems(learnContent, learnTemplatesById.value, "learn"));
		const filteredGetStarted = computed(() => filterItems(getStartedItems.value));
		const filteredGetInspired = computed(() => filterItems(getInspiredItems.value));
		const filteredLearn = computed(() => filterItems(learnItems.value));
		const hasResults = computed(() => filteredGetStarted.value.length > 0 || filteredGetInspired.value.length > 0 || filteredLearn.value.length > 0);
		const isSearching = computed(() => debouncedSearch.value !== "");
		const handleCardClick = (item) => {
			if (item.type === "ready-to-run" && item.quickStartId) {
				resourceCenterStore.trackTileClick("quick-start", "ready-to-run", item.quickStartId);
				resourceCenterStore.createAndOpenQuickStartWorkflow(item.quickStartId);
				return;
			}
			if (item.type === "video") {
				const section = item.section ?? "learn";
				resourceCenterStore.trackTileClick(section, "video", item.id);
				const url = item.url ?? `https://www.youtube.com/watch?v=${item.videoId}`;
				window.open(url, "_blank", "noopener,noreferrer");
				return;
			}
			if (item.type === "template" && item.templateId) {
				const section = item.section ?? "learn";
				resourceCenterStore.trackTileClick(section, "template", item.templateId);
				router.push(resourceCenterStore.getTemplateRoute(item.templateId));
			}
		};
		const loadAllTemplates = async () => {
			isLoading.value = true;
			try {
				const [featured, learn] = await Promise.all([resourceCenterStore.loadTemplates(featuredTemplateIds), resourceCenterStore.loadTemplates(learnTemplateIds)]);
				featuredTemplates.value = featured;
				learnTemplates.value = learn;
			} finally {
				isLoading.value = false;
			}
		};
		const documentTitle = useDocumentTitle();
		onMounted(() => {
			documentTitle.set("Resource Center");
			resourceCenterStore.trackResourceCenterView();
			loadAllTemplates();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.container, { [_ctx.$style.dark]: isDarkTheme.value }]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("h1", { class: normalizeClass(_ctx.$style.pageTitle) }, toDisplayString(unref(i18n).baseText("experiments.resourceCenter.title")), 3), createBaseVNode("label", { class: normalizeClass(_ctx.$style.searchInput) }, [createVNode(unref(N8nIcon_default), {
				icon: "search",
				size: "small",
				class: normalizeClass(_ctx.$style.searchIcon)
			}, null, 8, ["class"]), createBaseVNode("input", {
				type: "text",
				value: searchQuery.value,
				placeholder: searchPlaceholder.value,
				class: normalizeClass(_ctx.$style.searchField),
				"data-testid": "resource-center-search",
				onInput: handleSearchInput
			}, null, 42, _hoisted_1)], 2)], 2), !isLoading.value && isSearching.value && !hasResults.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.noResults)
			}, toDisplayString(unref(i18n).baseText("experiments.resourceCenter.search.noResults")), 3)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
				filteredGetStarted.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.heroGrid)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(filteredGetStarted.value, (item, index) => {
					return openBlock(), createBlock(ResourceFeatureCard_default, {
						key: item.id,
						item,
						tone: index % 2 === 0 ? "rose" : "amber",
						onClick: ($event) => handleCardClick(item)
					}, null, 8, [
						"item",
						"tone",
						"onClick"
					]);
				}), 128))], 2)) : createCommentVNode("", true),
				filteredGetInspired.value.length > 0 ? (openBlock(), createElementBlock("section", {
					key: 1,
					class: normalizeClass(_ctx.$style.section)
				}, [createBaseVNode("h2", { class: normalizeClass(_ctx.$style.sectionTitle) }, toDisplayString(unref(i18n).baseText("experiments.resourceCenter.getInspired.title")), 3), isLoading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loading)
				}, [createVNode(unref(N8nSpinner_default), { size: "small" })], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.grid)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(filteredGetInspired.value, (item) => {
					return openBlock(), createBlock(ResourceCard_default, {
						key: item.id,
						item,
						onClick: ($event) => handleCardClick(item)
					}, null, 8, ["item", "onClick"]);
				}), 128))], 2))], 2)) : createCommentVNode("", true),
				filteredLearn.value.length > 0 ? (openBlock(), createElementBlock("section", {
					key: 2,
					class: normalizeClass(_ctx.$style.section)
				}, [createBaseVNode("h2", { class: normalizeClass(_ctx.$style.sectionTitle) }, toDisplayString(unref(i18n).baseText("workflows.empty.learnN8n")), 3), isLoading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loading)
				}, [createVNode(unref(N8nSpinner_default), { size: "small" })], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.grid)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(filteredLearn.value, (item) => {
					return openBlock(), createBlock(ResourceCard_default, {
						key: item.id,
						item,
						onClick: ($event) => handleCardClick(item)
					}, null, 8, ["item", "onClick"]);
				}), 128))], 2))], 2)) : createCommentVNode("", true)
			], 64))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1qtdm_1",
	dark: "_dark_1qtdm_43",
	content: "_content_1qtdm_68",
	header: "_header_1qtdm_77",
	pageTitle: "_pageTitle_1qtdm_85",
	searchInput: "_searchInput_1qtdm_93",
	searchIcon: "_searchIcon_1qtdm_100",
	searchField: "_searchField_1qtdm_109",
	heroGrid: "_heroGrid_1qtdm_131",
	section: "_section_1qtdm_138",
	sectionTitle: "_sectionTitle_1qtdm_145",
	grid: "_grid_1qtdm_157",
	loading: "_loading_1qtdm_163",
	noResults: "_noResults_1qtdm_170"
} }]]);
//#endregion
export { ResourceCenterView_default as default };
