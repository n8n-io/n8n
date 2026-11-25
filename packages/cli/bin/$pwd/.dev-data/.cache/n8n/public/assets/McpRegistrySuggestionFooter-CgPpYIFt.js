import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _N as N8nText_default, lb as SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY, vy as usePostHog } from "./app-D5flEmb-.js";
//#region src/app/components/SuggestionFooter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["href"];
var SuggestionFooter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SuggestionFooter",
	props: {
		prompt: {},
		action: {},
		url: {}
	},
	setup(__props) {
		const props = __props;
		const suggestionUrl = computed(() => {
			if (!props.url) return void 0;
			try {
				return new URL(props.url).protocol === "https:" ? props.url : void 0;
			} catch {
				return;
			}
		});
		return (_ctx, _cache) => {
			return suggestionUrl.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.footer),
				"data-test-id": "suggest-tool-footer"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.prompt), 1)]),
				_: 1
			}), createBaseVNode("a", {
				class: normalizeClass([_ctx.$style.link, "ignore-key-press-node-creator"]),
				href: suggestionUrl.value,
				target: "_blank",
				rel: "noopener noreferrer"
			}, toDisplayString(__props.action), 11, _hoisted_1)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	footer: "_footer_1fd9m_2",
	link: "_link_1fd9m_10"
} }]]);
//#endregion
//#region src/app/components/McpRegistrySuggestionFooter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/app/components/McpRegistrySuggestionFooter.vue
var McpRegistrySuggestionFooter_default = /* @__PURE__ */ defineComponent({
	__name: "McpRegistrySuggestionFooter",
	props: {
		prompt: {},
		action: {}
	},
	setup(__props) {
		const posthogStore = usePostHog();
		const suggestionUrl = computed(() => {
			const payload = posthogStore.getFeatureFlagPayload(SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY);
			return typeof payload === "string" ? payload : void 0;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(SuggestionFooter_default, {
				prompt: __props.prompt,
				action: __props.action,
				url: suggestionUrl.value
			}, null, 8, [
				"prompt",
				"action",
				"url"
			]);
		};
	}
});
//#endregion
export { SuggestionFooter_default as n, McpRegistrySuggestionFooter_default as t };
