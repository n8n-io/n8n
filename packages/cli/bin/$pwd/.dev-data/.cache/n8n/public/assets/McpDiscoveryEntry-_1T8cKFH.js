import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Bu as useIntersectionObserver, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bf as useId, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, jN as useI18n, xN as N8nIcon_default, yN as N8nButton_default, zt as useMcpDiscovery } from "./app-D5flEmb-.js";
import { t as ClaudeLogo_default } from "./ClaudeLogo-BjBNPRr6.js";
//#region src/experiments/surfaceMcpToClaudeTrialUsers/ClaudeEntryPoint.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["id"];
var _hoisted_2 = [
	"aria-label",
	"aria-describedby",
	"data-test-id"
];
var _hoisted_3 = ["id"];
var ClaudeEntryPoint_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ClaudeEntryPoint",
	props: {
		placement: {},
		collapsed: {
			type: Boolean,
			default: false
		},
		label: {},
		title: { default: void 0 },
		description: { default: void 0 }
	},
	emits: ["click"],
	setup(__props, { emit: __emit }) {
		const descriptionId = useId();
		const emit = __emit;
		return (_ctx, _cache) => {
			return __props.placement === "sidebar" && !__props.collapsed && __props.title ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.card)
			}, [
				createBaseVNode("span", { class: normalizeClass(_ctx.$style.cardTitle) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.mark) }, [createVNode(ClaudeLogo_default)], 2), createBaseVNode("span", null, toDisplayString(__props.title), 1)], 2),
				createBaseVNode("span", {
					id: unref(descriptionId),
					class: normalizeClass(_ctx.$style.description)
				}, toDisplayString(__props.description), 11, _hoisted_1),
				createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					"aria-describedby": unref(descriptionId),
					"data-test-id": "claude-entry-sidebar",
					onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("click"), ["stop"]))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.label), 1)]),
					_: 1
				}, 8, ["aria-describedby"])
			], 2)) : (openBlock(), createElementBlock("button", {
				key: 1,
				type: "button",
				class: normalizeClass([
					_ctx.$style.entry,
					_ctx.$style[__props.placement],
					{ [_ctx.$style.collapsed]: __props.collapsed }
				]),
				"aria-label": __props.label,
				"aria-describedby": !__props.collapsed && __props.description ? unref(descriptionId) : void 0,
				"data-test-id": `claude-entry-${__props.placement}`,
				onClick: _cache[1] || (_cache[1] = withModifiers(($event) => emit("click"), ["stop"]))
			}, [
				createBaseVNode("span", { class: normalizeClass(_ctx.$style.mark) }, [createVNode(ClaudeLogo_default)], 2),
				!__props.collapsed ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.copy)
				}, [createBaseVNode("span", null, toDisplayString(__props.label), 1), __props.description ? (openBlock(), createElementBlock("span", {
					key: 0,
					id: unref(descriptionId),
					class: normalizeClass(_ctx.$style.description)
				}, toDisplayString(__props.description), 11, _hoisted_3)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
				__props.placement !== "canvas" && !__props.collapsed ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: __props.placement === "footer" ? "arrow-right" : "chevron-right",
					size: __props.placement === "sidebar" ? "large" : "small"
				}, null, 8, ["icon", "size"])) : createCommentVNode("", true)
			], 10, _hoisted_2));
		};
	}
}), [["__cssModules", { "$style": {
	entry: "_entry_1mwak_11",
	mark: "_mark_1mwak_34",
	copy: "_copy_1mwak_45",
	description: "_description_1mwak_53",
	card: "_card_1mwak_57",
	cardTitle: "_cardTitle_1mwak_71",
	sidebar: "_sidebar_1mwak_83",
	collapsed: "_collapsed_1mwak_105",
	footer: "_footer_1mwak_113",
	canvas: "_canvas_1mwak_134",
	suggestionSlideIn: "_suggestionSlideIn_1mwak_1"
} }]]);
//#endregion
//#region src/experiments/surfaceMcpToClaudeTrialUsers/McpDiscoveryEntry.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var McpDiscoveryEntry_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpDiscoveryEntry",
	props: {
		placement: {},
		collapsed: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const target = ref();
		const i18n = useI18n();
		const { showMcpDiscovery, mcpDiscovery: discovery, entryLabel, openEntry } = useMcpDiscovery();
		const isBuildStage = computed(() => discovery.ctaStage === "build");
		const showSidebarCard = computed(() => props.placement === "sidebar" && isBuildStage.value);
		const label = computed(() => props.placement === "footer" && isBuildStage.value ? i18n.baseText("experiments.mcpDiscovery.footer.build") : entryLabel.value);
		useIntersectionObserver(target, ([entry]) => {
			if (entry?.isIntersecting) discovery.trackEntry(props.placement, "viewed");
		});
		return (_ctx, _cache) => {
			return unref(showMcpDiscovery) ? (openBlock(), createElementBlock("span", {
				key: 0,
				ref_key: "target",
				ref: target,
				class: normalizeClass([_ctx.$style.wrapper, _ctx.$style[__props.placement]])
			}, [__props.placement === "footer" && isBuildStage.value ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.prefix)
			}, toDisplayString(unref(i18n).baseText("experiments.mcpDiscovery.footer.prefix")), 3)) : createCommentVNode("", true), createVNode(ClaudeEntryPoint_default, {
				placement: __props.placement,
				collapsed: __props.collapsed,
				label: label.value,
				title: showSidebarCard.value ? unref(i18n).baseText("experiments.mcpDiscovery.sidebar.title") : void 0,
				description: showSidebarCard.value ? unref(i18n).baseText("experiments.mcpDiscovery.sidebar.description") : void 0,
				onClick: _cache[0] || (_cache[0] = ($event) => unref(openEntry)(__props.placement))
			}, null, 8, [
				"placement",
				"collapsed",
				"label",
				"title",
				"description"
			])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_1qk2t_2",
	sidebar: "_sidebar_1qk2t_6",
	footer: "_footer_1qk2t_10",
	prefix: "_prefix_1qk2t_15"
} }]]);
//#endregion
export { McpDiscoveryEntry_default as t };
