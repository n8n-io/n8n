import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Hd as createElementBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Xf as unref, _p as normalizeClass, ef as inject, ff as openBlock, ip as init_shared_esm_bundler, vf as resolveDynamicComponent } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, qj as N8nNodeIcon_default, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { a as TOOL_ICON_AVATAR_RENDERER_KEY } from "./ToolCredentialPicker-Clmo6S9M.js";
//#region src/features/shared/toolsConnection/ToolIcon.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var INNER_SIZE = 20;
var AVATAR_SIZE = 40;
var ToolIcon_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolIcon",
	props: {
		source: { default: null },
		fallbackIcon: { default: "toolbox" }
	},
	setup(__props) {
		const avatarRenderer = inject(TOOL_ICON_AVATAR_RENDERER_KEY, null);
		return (_ctx, _cache) => {
			return __props.source?.type === "avatar" && unref(avatarRenderer) ? (openBlock(), createBlock(resolveDynamicComponent(unref(avatarRenderer)), {
				key: 0,
				personalisation: __props.source.personalisation,
				size: AVATAR_SIZE
			}, null, 8, ["personalisation"])) : (openBlock(), createElementBlock("span", {
				key: 1,
				class: normalizeClass(_ctx.$style.wrapper),
				"aria-hidden": "true"
			}, [__props.source && __props.source.type !== "avatar" ? (openBlock(), createBlock(unref(N8nNodeIcon_default), {
				key: 0,
				type: __props.source.type,
				src: __props.source.type === "file" ? __props.source.src : void 0,
				name: __props.source.type === "icon" ? __props.source.name : void 0,
				color: __props.source.type === "icon" ? __props.source.color : void 0,
				size: INNER_SIZE
			}, null, 8, [
				"type",
				"src",
				"name",
				"color"
			])) : (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 1,
				icon: __props.fallbackIcon,
				size: INNER_SIZE,
				class: normalizeClass(_ctx.$style.fallback)
			}, null, 8, ["icon", "class"]))], 2));
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_12ruk_1",
	fallback: "_fallback_12ruk_13"
} }]]);
//#endregion
export { ToolIcon_default as t };
