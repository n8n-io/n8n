const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_ColorArea_ColorAreaRoot = require('./ColorAreaRoot.cjs');
const require_ColorArea_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ColorArea/ColorAreaArea.vue?vue&type=script&setup=true&lang.ts
var ColorAreaArea_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_ColorArea_ColorAreaRoot.injectColorAreaRootContext();
		const { primitiveElement, currentElement: areaElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const isDragging = (0, vue.ref)(false);
		function getValuesFromPointer(event) {
			const rect = areaElement.value.getBoundingClientRect();
			const xInput = [0, rect.width];
			const xOutput = [rootContext.xRange.value.min, rootContext.xRange.value.max];
			const xScale = require_ColorArea_utils.linearScale(xInput, xOutput);
			const xValue = xScale(event.clientX - rect.left);
			const yInput = [0, rect.height];
			const yOutput = [rootContext.yRange.value.max, rootContext.yRange.value.min];
			const yScale = require_ColorArea_utils.linearScale(yInput, yOutput);
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				role: "application",
				"aria-roledescription": "Color picker",
				"aria-disabled": (0, vue.unref)(rootContext).disabled.value ? "true" : void 0,
				"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
				style: { touchAction: "none" },
				onKeydown: handleKeyDown,
				onPointerdown: handlePointerDown,
				onPointermove: handlePointerMove,
				onPointerup: handlePointerUp
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'ColorAreaArea_default', {
  enumerable: true,
  get: function () {
    return ColorAreaArea_default;
  }
});
//# sourceMappingURL=ColorAreaArea.cjs.map