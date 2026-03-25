const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RovingFocus_RovingFocusItem = require('../RovingFocus/RovingFocusItem.cjs');
const require_Tabs_TabsRoot = require('./TabsRoot.cjs');
const require_Tabs_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Tabs/TabsTrigger.vue?vue&type=script&setup=true&lang.ts
var TabsTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TabsTrigger",
	props: {
		value: {
			type: [String, Number],
			required: true
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Tabs_TabsRoot.injectTabsRootContext();
		const triggerId = (0, vue.computed)(() => require_Tabs_utils.makeTriggerId(rootContext.baseId, props.value));
		const contentId = (0, vue.computed)(() => require_Tabs_utils.makeContentId(rootContext.baseId, props.value));
		const isSelected = (0, vue.computed)(() => props.value === rootContext.modelValue.value);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusItem.RovingFocusItem_default), {
				"as-child": "",
				focusable: !_ctx.disabled,
				active: isSelected.value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					id: triggerId.value,
					ref: (0, vue.unref)(forwardRef),
					role: "tab",
					type: _ctx.as === "button" ? "button" : void 0,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-selected": isSelected.value ? "true" : "false",
					"aria-controls": contentId.value,
					"data-state": isSelected.value ? "active" : "inactive",
					disabled: _ctx.disabled,
					"data-disabled": _ctx.disabled ? "" : void 0,
					"data-orientation": (0, vue.unref)(rootContext).orientation.value,
					onMousedown: _cache[0] || (_cache[0] = (0, vue.withModifiers)((event) => {
						if (!_ctx.disabled && event.ctrlKey === false) (0, vue.unref)(rootContext).changeModelValue(_ctx.value);
						else event.preventDefault();
					}, ["left"])),
					onKeydown: _cache[1] || (_cache[1] = (0, vue.withKeys)(($event) => (0, vue.unref)(rootContext).changeModelValue(_ctx.value), ["enter", "space"])),
					onFocus: _cache[2] || (_cache[2] = () => {
						const isAutomaticActivation = (0, vue.unref)(rootContext).activationMode !== "manual";
						if (!isSelected.value && !_ctx.disabled && isAutomaticActivation) (0, vue.unref)(rootContext).changeModelValue(_ctx.value);
					})
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"id",
					"type",
					"as",
					"as-child",
					"aria-selected",
					"aria-controls",
					"data-state",
					"disabled",
					"data-disabled",
					"data-orientation"
				])]),
				_: 3
			}, 8, ["focusable", "active"]);
		};
	}
});

//#endregion
//#region src/Tabs/TabsTrigger.vue
var TabsTrigger_default = TabsTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TabsTrigger_default', {
  enumerable: true,
  get: function () {
    return TabsTrigger_default;
  }
});
//# sourceMappingURL=TabsTrigger.cjs.map