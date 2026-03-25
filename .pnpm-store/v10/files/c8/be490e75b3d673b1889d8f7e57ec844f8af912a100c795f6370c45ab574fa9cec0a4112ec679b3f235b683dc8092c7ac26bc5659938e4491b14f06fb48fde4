const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Menu_utils = require('./utils.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Menu_MenuContentImpl = require('./MenuContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuItemImpl.vue?vue&type=script&setup=true&lang.ts
var MenuItemImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "MenuItemImpl",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
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
		const contentContext = require_Menu_MenuContentImpl.injectMenuContentContext();
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionItem } = require_Collection_Collection.useCollection();
		const isFocused = (0, vue.ref)(false);
		async function handlePointerMove(event) {
			if (event.defaultPrevented) return;
			if (!require_Menu_utils.isMouseEvent(event)) return;
			if (props.disabled) contentContext.onItemLeave(event);
			else {
				const defaultPrevented = contentContext.onItemEnter(event);
				if (!defaultPrevented) {
					const item = event.currentTarget;
					item?.focus({ preventScroll: true });
				}
			}
		}
		async function handlePointerLeave(event) {
			await (0, vue.nextTick)();
			if (event.defaultPrevented) return;
			if (!require_Menu_utils.isMouseEvent(event)) return;
			contentContext.onItemLeave(event);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionItem), { value: { textValue: _ctx.textValue } }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					role: "menuitem",
					tabindex: "-1"
				}, _ctx.$attrs, {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-disabled": _ctx.disabled || void 0,
					"data-disabled": _ctx.disabled ? "" : void 0,
					"data-highlighted": isFocused.value ? "" : void 0,
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onFocus: _cache[0] || (_cache[0] = async (event) => {
						await (0, vue.nextTick)();
						if (event.defaultPrevented || _ctx.disabled) return;
						isFocused.value = true;
					}),
					onBlur: _cache[1] || (_cache[1] = async (event) => {
						await (0, vue.nextTick)();
						if (event.defaultPrevented) return;
						isFocused.value = false;
					})
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"as",
					"as-child",
					"aria-disabled",
					"data-disabled",
					"data-highlighted"
				])]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuItemImpl.vue
var MenuItemImpl_default = MenuItemImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuItemImpl_default', {
  enumerable: true,
  get: function () {
    return MenuItemImpl_default;
  }
});
//# sourceMappingURL=MenuItemImpl.cjs.map