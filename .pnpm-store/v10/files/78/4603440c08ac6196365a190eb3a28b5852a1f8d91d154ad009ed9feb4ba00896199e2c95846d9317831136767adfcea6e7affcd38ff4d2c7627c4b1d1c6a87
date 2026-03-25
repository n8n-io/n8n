const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectScrollButtonImpl.vue?vue&type=script&setup=true&lang.ts
var SelectScrollButtonImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SelectScrollButtonImpl",
	emits: ["autoScroll"],
	setup(__props, { emit: __emit }) {
		const emits = __emit;
		const { getItems } = require_Collection_Collection.useCollection();
		const contentContext = require_Select_SelectContentImpl.injectSelectContentContext();
		const autoScrollTimerRef = (0, vue.ref)(null);
		function clearAutoScrollTimer() {
			if (autoScrollTimerRef.value !== null) {
				window.clearInterval(autoScrollTimerRef.value);
				autoScrollTimerRef.value = null;
			}
		}
		(0, vue.watchEffect)(() => {
			const activeItem = getItems().map((i) => i.ref).find((item) => item === require_shared_getActiveElement.getActiveElement());
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
		(0, vue.onBeforeUnmount)(() => clearAutoScrollTimer());
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				"aria-hidden": "true",
				style: { flexShrink: 0 }
			}, _ctx.$parent?.$props, {
				onPointerdown: handlePointerDown,
				onPointermove: handlePointerMove,
				onPointerleave: _cache[0] || (_cache[0] = () => {
					clearAutoScrollTimer();
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Select/SelectScrollButtonImpl.vue
var SelectScrollButtonImpl_default = SelectScrollButtonImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectScrollButtonImpl_default', {
  enumerable: true,
  get: function () {
    return SelectScrollButtonImpl_default;
  }
});
//# sourceMappingURL=SelectScrollButtonImpl.cjs.map