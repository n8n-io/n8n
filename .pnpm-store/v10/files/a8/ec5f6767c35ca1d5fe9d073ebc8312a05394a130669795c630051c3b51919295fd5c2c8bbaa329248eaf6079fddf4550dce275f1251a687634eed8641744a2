const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Menu_MenuAnchor = require('../Menu/MenuAnchor.cjs');
const require_DropdownMenu_DropdownMenuRoot = require('./DropdownMenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/DropdownMenu/DropdownMenuTrigger.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DropdownMenuTrigger",
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
		const props = __props;
		const rootContext = require_DropdownMenu_DropdownMenuRoot.injectDropdownMenuRootContext();
		const { forwardRef, currentElement: triggerElement } = require_shared_useForwardExpose.useForwardExpose();
		(0, vue.onMounted)(() => {
			rootContext.triggerElement = triggerElement;
		});
		rootContext.triggerId ||= require_shared_useId.useId(void 0, "reka-dropdown-menu-trigger");
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuAnchor.MenuAnchor_default), { "as-child": "" }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					id: (0, vue.unref)(rootContext).triggerId,
					ref: (0, vue.unref)(forwardRef),
					type: _ctx.as === "button" ? "button" : void 0,
					"as-child": props.asChild,
					as: _ctx.as,
					"aria-haspopup": "menu",
					"aria-expanded": (0, vue.unref)(rootContext).open.value,
					"aria-controls": (0, vue.unref)(rootContext).open.value ? (0, vue.unref)(rootContext).contentId : void 0,
					"data-disabled": _ctx.disabled ? "" : void 0,
					disabled: _ctx.disabled,
					"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
					onClick: _cache[0] || (_cache[0] = async (event) => {
						if (!_ctx.disabled && event.button === 0 && event.ctrlKey === false) {
							(0, vue.unref)(rootContext)?.onOpenToggle();
							await (0, vue.nextTick)();
							if ((0, vue.unref)(rootContext).open.value) event.preventDefault();
						}
					}),
					onKeydown: _cache[1] || (_cache[1] = (0, vue.withKeys)((event) => {
						if (_ctx.disabled) return;
						if (["Enter", " "].includes(event.key)) (0, vue.unref)(rootContext).onOpenToggle();
						if (event.key === "ArrowDown") (0, vue.unref)(rootContext).onOpenChange(true);
						if ([
							"Enter",
							" ",
							"ArrowDown"
						].includes(event.key)) event.preventDefault();
					}, [
						"enter",
						"space",
						"arrow-down"
					]))
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"id",
					"type",
					"as-child",
					"as",
					"aria-expanded",
					"aria-controls",
					"data-disabled",
					"disabled",
					"data-state"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/DropdownMenu/DropdownMenuTrigger.vue
var DropdownMenuTrigger_default = DropdownMenuTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DropdownMenuTrigger_default', {
  enumerable: true,
  get: function () {
    return DropdownMenuTrigger_default;
  }
});
//# sourceMappingURL=DropdownMenuTrigger.cjs.map