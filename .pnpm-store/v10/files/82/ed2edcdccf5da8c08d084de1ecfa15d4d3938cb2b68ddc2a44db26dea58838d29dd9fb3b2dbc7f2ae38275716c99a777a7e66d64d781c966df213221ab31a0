import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectColorAreaRootContext } from "./ColorAreaRoot.js";
import { linearScale } from "./utils.js";
import { createBlock, defineComponent, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/ColorArea/ColorAreaArea.vue?vue&type=script&setup=true&lang.ts
var ColorAreaArea_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ColorAreaArea",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectColorAreaRootContext();
		const { primitiveElement, currentElement: areaElement } = usePrimitiveElement();
		const isDragging = ref(false);
		function getValuesFromPointer(event) {
			const rect = areaElement.value.getBoundingClientRect();
			const xInput = [0, rect.width];
			const xOutput = [rootContext.xRange.value.min, rootContext.xRange.value.max];
			const xScale = linearScale(xInput, xOutput);
			const xValue = xScale(event.clientX - rect.left);
			const yInput = [0, rect.height];
			const yOutput = [rootContext.yRange.value.max, rootContext.yRange.value.min];
			const yScale = linearScale(yInput, yOutput);
			const yValue = yScale(event.clientY - rect.top);
			return {
				x: xValue,
				y: yValue
			};
		}
		function handlePointerDown(event) {
			if (rootContext.disabled.value) return;
			const target = event.target;
			target.setPointerCapture(event.pointerId);
			event.preventDefault();
			isDragging.value = true;
			const { x, y } = getValuesFromPointer(event);
			rootContext.updateValues(x, y);
			rootContext.thumbRef.value?.focus();
		}
		function handlePointerMove(event) {
			if (!isDragging.value || rootContext.disabled.value) return;
			const target = event.target;
			if (target.hasPointerCapture(event.pointerId)) {
				const { x, y } = getValuesFromPointer(event);
				rootContext.updateValues(x, y);
			}
		}
		function handlePointerUp(event) {
			if (!isDragging.value) return;
			const target = event.target;
			target.releasePointerCapture(event.pointerId);
			isDragging.value = false;
			rootContext.commitValues();
		}
		function handleKeyDown(event) {
			if (rootContext.disabled.value) return;
			const stepMultiplier = event.shiftKey ? 10 : 1;
			const xStepSize = rootContext.xRange.value.step * stepMultiplier;
			const yStepSize = rootContext.yRange.value.step * stepMultiplier;
			let xDelta = 0;
			let yDelta = 0;
			switch (event.key) {
				case "ArrowLeft":
					xDelta = -xStepSize;
					break;
				case "ArrowRight":
					xDelta = xStepSize;
					break;
				case "ArrowUp":
					yDelta = yStepSize;
					break;
				case "ArrowDown":
					yDelta = -yStepSize;
					break;
				case "PageUp":
					yDelta = yStepSize * 10;
					break;
				case "PageDown":
					yDelta = -yStepSize * 10;
					break;
				case "Home":
					xDelta = -xStepSize * 10;
					break;
				case "End":
					xDelta = xStepSize * 10;
					break;
				default: return;
			}
			event.preventDefault();
			rootContext.updateValues(rootContext.xValue.value + xDelta, rootContext.yValue.value + yDelta);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				role: "application",
				"aria-roledescription": "Color picker",
				"aria-disabled": unref(rootContext).disabled.value ? "true" : void 0,
				"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
				style: { touchAction: "none" },
				onKeydown: handleKeyDown,
				onPointerdown: handlePointerDown,
				onPointermove: handlePointerMove,
				onPointerup: handlePointerUp
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"aria-disabled",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/ColorArea/ColorAreaArea.vue
var ColorAreaArea_default = ColorAreaArea_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorAreaArea_default };
//# sourceMappingURL=ColorAreaArea.js.map