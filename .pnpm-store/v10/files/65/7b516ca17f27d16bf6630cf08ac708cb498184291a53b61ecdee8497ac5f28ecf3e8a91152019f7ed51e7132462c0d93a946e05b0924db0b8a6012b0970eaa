const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Tabs_TabsRoot = require('./TabsRoot.cjs');
const require_Tabs_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Tabs/TabsContent.vue?vue&type=script&setup=true&lang.ts
var TabsContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TabsContent",
	props: {
		value: {
			type: [String, Number],
			required: true
		},
		forceMount: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Tabs_TabsRoot.injectTabsRootContext();
		const triggerId = (0, vue.computed)(() => require_Tabs_utils.makeTriggerId(rootContext.baseId, props.value));
		const contentId = (0, vue.computed)(() => require_Tabs_utils.makeContentId(rootContext.baseId, props.value));
		const isSelected = (0, vue.computed)(() => props.value === rootContext.modelValue.value);
		const isMountAnimationPreventedRef = (0, vue.ref)(isSelected.value);
		(0, vue.onMounted)(() => {
			requestAnimationFrame(() => {
				isMountAnimationPreventedRef.value = false;
			});
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), {
				present: _ctx.forceMount || isSelected.value,
				"force-mount": ""
			}, {
				default: (0, vue.withCtx)(({ present }) => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					id: contentId.value,
					ref: (0, vue.unref)(forwardRef),
					"as-child": _ctx.asChild,
					as: _ctx.as,
					role: "tabpanel",
					"data-state": isSelected.value ? "active" : "inactive",
					"data-orientation": (0, vue.unref)(rootContext).orientation.value,
					"aria-labelledby": triggerId.value,
					hidden: !present,
					tabindex: "0",
					style: (0, vue.normalizeStyle)({ animationDuration: isMountAnimationPreventedRef.value ? "0s" : void 0 })
				}, {
					default: (0, vue.withCtx)(() => [((0, vue.unref)(rootContext).unmountOnHide.value ? present : true) ? (0, vue.renderSlot)(_ctx.$slots, "default", { key: 0 }) : (0, vue.createCommentVNode)("v-if", true)]),
					_: 2
				}, 1032, [
					"id",
					"as-child",
					"as",
					"data-state",
					"data-orientation",
					"aria-labelledby",
					"hidden",
					"style"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Tabs/TabsContent.vue
var TabsContent_default = TabsContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TabsContent_default', {
  enumerable: true,
  get: function () {
    return TabsContent_default;
  }
});
//# sourceMappingURL=TabsContent.cjs.map