const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_RovingFocusItem = require('../RovingFocus/RovingFocusItem.cjs');
const require_Menu_MenuAnchor = require('../Menu/MenuAnchor.cjs');
const require_Menubar_MenubarRoot = require('./MenubarRoot.cjs');
const require_Menubar_MenubarMenu = require('./MenubarMenu.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menubar/MenubarTrigger.vue?vue&type=script&setup=true&lang.ts
var MenubarTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenubarTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
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
		const rootContext = require_Menubar_MenubarRoot.injectMenubarRootContext();
		const menuContext = require_Menubar_MenubarMenu.injectMenubarMenuContext();
		const { forwardRef, currentElement: triggerElement } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionItem } = require_Collection_Collection.useCollection({ key: "Menubar" });
		const isFocused = (0, vue.ref)(false);
		const open = (0, vue.computed)(() => rootContext.modelValue.value === menuContext.value);
		(0, vue.onMounted)(() => {
			menuContext.triggerElement = triggerElement;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusItem.RovingFocusItem_default), {
				"as-child": "",
				focusable: !_ctx.disabled,
				"tab-stop-id": (0, vue.unref)(menuContext).value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(CollectionItem), null, {
					default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Menu_MenuAnchor.MenuAnchor_default), { "as-child": "" }, {
						default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
							id: (0, vue.unref)(menuContext).triggerId,
							ref: (0, vue.unref)(forwardRef),
							as: _ctx.as,
							"as-child": _ctx.asChild,
							type: _ctx.as === "button" ? "button" : void 0,
							role: "menuitem",
							"aria-haspopup": "menu",
							"aria-expanded": open.value,
							"aria-controls": open.value ? (0, vue.unref)(menuContext).contentId : void 0,
							"data-highlighted": isFocused.value ? "" : void 0,
							"data-state": open.value ? "open" : "closed",
							"data-disabled": _ctx.disabled ? "" : void 0,
							disabled: _ctx.disabled,
							"data-value": (0, vue.unref)(menuContext).value,
							onPointerdown: _cache[0] || (_cache[0] = (event) => {
								if (!_ctx.disabled && event.button === 0 && event.ctrlKey === false) {
									(0, vue.unref)(rootContext).onMenuOpen((0, vue.unref)(menuContext).value);
									if (!open.value) event.preventDefault();
								}
							}),
							onPointerenter: _cache[1] || (_cache[1] = () => {
								const menubarOpen = Boolean((0, vue.unref)(rootContext).modelValue.value);
								if (menubarOpen && !open.value) {
									(0, vue.unref)(rootContext).onMenuOpen((0, vue.unref)(menuContext).value);
									(0, vue.unref)(triggerElement)?.focus();
								}
							}),
							onKeydown: _cache[2] || (_cache[2] = (0, vue.withKeys)((event) => {
								if (_ctx.disabled) return;
								if (["Enter", " "].includes(event.key)) (0, vue.unref)(rootContext).onMenuToggle((0, vue.unref)(menuContext).value);
								if (event.key === "ArrowDown") (0, vue.unref)(rootContext).onMenuOpen((0, vue.unref)(menuContext).value);
								if ([
									"Enter",
									" ",
									"ArrowDown"
								].includes(event.key)) {
									(0, vue.unref)(menuContext).wasKeyboardTriggerOpenRef.value = true;
									event.preventDefault();
								}
							}, [
								"enter",
								"space",
								"arrow-down"
							])),
							onFocus: _cache[3] || (_cache[3] = ($event) => isFocused.value = true),
							onBlur: _cache[4] || (_cache[4] = ($event) => isFocused.value = false)
						}, {
							default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
							_: 3
						}, 8, [
							"id",
							"as",
							"as-child",
							"type",
							"aria-expanded",
							"aria-controls",
							"data-highlighted",
							"data-state",
							"data-disabled",
							"disabled",
							"data-value"
						])]),
						_: 3
					})]),
					_: 3
				})]),
				_: 3
			}, 8, ["focusable", "tab-stop-id"]);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarTrigger.vue
var MenubarTrigger_default = MenubarTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenubarTrigger_default', {
  enumerable: true,
  get: function () {
    return MenubarTrigger_default;
  }
});
//# sourceMappingURL=MenubarTrigger.cjs.map