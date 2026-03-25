import { getActiveElement } from "../shared/getActiveElement.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { injectSelectContentContext } from "./SelectContentImpl.js";
import { createBlock, defineComponent, mergeProps, onBeforeUnmount, openBlock, ref, renderSlot, unref, watchEffect, withCtx } from "vue";

//#region src/Select/SelectScrollButtonImpl.vue?vue&type=script&setup=true&lang.ts
var SelectScrollButtonImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SelectScrollButtonImpl",
	emits: ["autoScroll"],
	setup(__props, { emit: __emit }) {
		const emits = __emit;
		const { getItems } = useCollection();
		const contentContext = injectSelectContentContext();
		const autoScrollTimerRef = ref(null);
		function clearAutoScrollTimer() {
			if (autoScrollTimerRef.value !== null) {
				window.clearInterval(autoScrollTimerRef.value);
				autoScrollTimerRef.value = null;
			}
		}
		watchEffect(() => {
			const activeItem = getItems().map((i) => i.ref).find((item) => item === getActiveElement());
			activeItem?.scrollIntoView({ block: "nearest" });
		});
		function handlePointerDown() {
			if (autoScrollTimerRef.value === null) autoScrollTimerRef.value = window.setInterval(() => {
				emits("autoScroll");
			}, 50);
		}
		function handlePointerMove() {
			contentContext.onItemLeave?.();
			if (autoScrollTimerRef.value === null) autoScrollTimerRef.value = window.setInterval(() => {
				emits("autoScroll");
			}, 50);
		}
		onBeforeUnmount(() => clearAutoScrollTimer());
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({
				"aria-hidden": "true",
				style: { flexShrink: 0 }
			}, _ctx.$parent?.$props, {
				onPointerdown: handlePointerDown,
				onPointermove: handlePointerMove,
				onPointerleave: _cache[0] || (_cache[0] = () => {
					clearAutoScrollTimer();
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Select/SelectScrollButtonImpl.vue
var SelectScrollButtonImpl_default = SelectScrollButtonImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectScrollButtonImpl_default };
//# sourceMappingURL=SelectScrollButtonImpl.js.map