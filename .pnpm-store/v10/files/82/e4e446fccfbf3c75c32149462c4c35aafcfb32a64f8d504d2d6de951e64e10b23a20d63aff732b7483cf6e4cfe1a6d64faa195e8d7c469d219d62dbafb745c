import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { useTypeahead } from "../shared/useTypeahead.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { PopperAnchor_default } from "../Popper/PopperAnchor.js";
import { OPEN_KEYS, shouldShowPlaceholder } from "./utils.js";
import { injectSelectRootContext } from "./SelectRoot.js";
import { computed, createBlock, createVNode, defineComponent, onMounted, openBlock, renderSlot, unref, withCtx, withModifiers } from "vue";

//#region src/Select/SelectTrigger.vue?vue&type=script&setup=true&lang.ts
var SelectTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const rootContext = injectSelectRootContext();
		const { forwardRef, currentElement: triggerElement } = useForwardExpose();
		const isDisabled = computed(() => rootContext.disabled?.value || props.disabled);
		rootContext.contentId ||= useId(void 0, "reka-select-content");
		onMounted(() => {
			rootContext.onTriggerChange(triggerElement.value);
		});
		const { getItems } = useCollection();
		const { search, handleTypeaheadSearch, resetTypeahead } = useTypeahead();
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
			return openBlock(), createBlock(unref(PopperAnchor_default), {
				"as-child": "",
				reference: _ctx.reference
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					role: "combobox",
					type: _ctx.as === "button" ? "button" : void 0,
					"aria-controls": unref(rootContext).contentId,
					"aria-expanded": unref(rootContext).open.value || false,
					"aria-required": unref(rootContext).required?.value,
					"aria-autocomplete": "none",
					disabled: isDisabled.value,
					dir: unref(rootContext)?.dir.value,
					"data-state": unref(rootContext)?.open.value ? "open" : "closed",
					"data-disabled": isDisabled.value ? "" : void 0,
					"data-placeholder": unref(shouldShowPlaceholder)(unref(rootContext).modelValue?.value) ? "" : void 0,
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
					onPointerup: _cache[2] || (_cache[2] = withModifiers((event) => {
						if (event.pointerType === "touch") handlePointerOpen(event);
					}, ["prevent"])),
					onKeydown: _cache[3] || (_cache[3] = (event) => {
						const isTypingAhead = unref(search) !== "";
						const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
						if (!isModifierKey && event.key.length === 1) {
							if (isTypingAhead && event.key === " ") return;
						}
						unref(handleTypeaheadSearch)(event.key, unref(getItems)());
						if (unref(OPEN_KEYS).includes(event.key)) {
							handleOpen();
							event.preventDefault();
						}
					})
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { SelectTrigger_default };
//# sourceMappingURL=SelectTrigger.js.map