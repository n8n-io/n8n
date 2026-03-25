const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Popper_PopperAnchor = require('../Popper/PopperAnchor.cjs');
const require_Select_utils = require('./utils.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectTrigger.vue?vue&type=script&setup=true&lang.ts
var SelectTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SelectTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
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
		const rootContext = require_Select_SelectRoot.injectSelectRootContext();
		const { forwardRef, currentElement: triggerElement } = require_shared_useForwardExpose.useForwardExpose();
		const isDisabled = (0, vue.computed)(() => rootContext.disabled?.value || props.disabled);
		rootContext.contentId ||= require_shared_useId.useId(void 0, "reka-select-content");
		(0, vue.onMounted)(() => {
			rootContext.onTriggerChange(triggerElement.value);
		});
		const { getItems } = require_Collection_Collection.useCollection();
		const { search, handleTypeaheadSearch, resetTypeahead } = require_shared_useTypeahead.useTypeahead();
		function handleOpen() {
			if (!isDisabled.value) {
				rootContext.onOpenChange(true);
				resetTypeahead();
			}
		}
		function handlePointerOpen(event) {
			handleOpen();
			rootContext.triggerPointerDownPosRef.value = {
				x: Math.round(event.pageX),
				y: Math.round(event.pageY)
			};
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperAnchor.PopperAnchor_default), {
				"as-child": "",
				reference: _ctx.reference
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					role: "combobox",
					type: _ctx.as === "button" ? "button" : void 0,
					"aria-controls": (0, vue.unref)(rootContext).contentId,
					"aria-expanded": (0, vue.unref)(rootContext).open.value || false,
					"aria-required": (0, vue.unref)(rootContext).required?.value,
					"aria-autocomplete": "none",
					disabled: isDisabled.value,
					dir: (0, vue.unref)(rootContext)?.dir.value,
					"data-state": (0, vue.unref)(rootContext)?.open.value ? "open" : "closed",
					"data-disabled": isDisabled.value ? "" : void 0,
					"data-placeholder": (0, vue.unref)(require_Select_utils.shouldShowPlaceholder)((0, vue.unref)(rootContext).modelValue?.value) ? "" : void 0,
					"as-child": _ctx.asChild,
					as: _ctx.as,
					onClick: _cache[0] || (_cache[0] = (event) => {
						(event?.currentTarget)?.focus();
					}),
					onPointerdown: _cache[1] || (_cache[1] = (event) => {
						if (event.pointerType === "touch") return event.preventDefault();
						const target = event.target;
						if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
						if (event.button === 0 && event.ctrlKey === false) {
							handlePointerOpen(event);
							event.preventDefault();
						}
					}),
					onPointerup: _cache[2] || (_cache[2] = (0, vue.withModifiers)((event) => {
						if (event.pointerType === "touch") handlePointerOpen(event);
					}, ["prevent"])),
					onKeydown: _cache[3] || (_cache[3] = (event) => {
						const isTypingAhead = (0, vue.unref)(search) !== "";
						const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
						if (!isModifierKey && event.key.length === 1) {
							if (isTypingAhead && event.key === " ") return;
						}
						(0, vue.unref)(handleTypeaheadSearch)(event.key, (0, vue.unref)(getItems)());
						if ((0, vue.unref)(require_Select_utils.OPEN_KEYS).includes(event.key)) {
							handleOpen();
							event.preventDefault();
						}
					})
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"type",
					"aria-controls",
					"aria-expanded",
					"aria-required",
					"disabled",
					"dir",
					"data-state",
					"data-disabled",
					"data-placeholder",
					"as-child",
					"as"
				])]),
				_: 3
			}, 8, ["reference"]);
		};
	}
});

//#endregion
//#region src/Select/SelectTrigger.vue
var SelectTrigger_default = SelectTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectTrigger_default', {
  enumerable: true,
  get: function () {
    return SelectTrigger_default;
  }
});
//# sourceMappingURL=SelectTrigger.cjs.map