const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Select_SelectItemAlignedPosition = require('./SelectItemAlignedPosition.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const require_Select_SelectScrollButtonImpl = require('./SelectScrollButtonImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectScrollDownButton.vue?vue&type=script&setup=true&lang.ts
var SelectScrollDownButton_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SelectScrollDownButton",
	props: {
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
		const contentContext = require_Select_SelectContentImpl.injectSelectContentContext();
		const alignedPositionContext = contentContext.position === "item-aligned" ? require_Select_SelectItemAlignedPosition.injectSelectItemAlignedPositionContext() : void 0;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const canScrollDown = (0, vue.ref)(false);
		(0, vue.watchEffect)((cleanupFn) => {
			if (contentContext.viewport?.value && contentContext.isPositioned?.value) {
				const viewport = contentContext.viewport.value;
				function handleScroll() {
					const maxScroll = viewport.scrollHeight - viewport.clientHeight;
					canScrollDown.value = Math.ceil(viewport.scrollTop) < maxScroll;
				}
				handleScroll();
				viewport.addEventListener("scroll", handleScroll);
				cleanupFn(() => viewport.removeEventListener("scroll", handleScroll));
			}
		});
		(0, vue.watch)(currentElement, () => {
			if (currentElement.value) alignedPositionContext?.onScrollButtonChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return canScrollDown.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Select_SelectScrollButtonImpl.SelectScrollButtonImpl_default, {
				key: 0,
				ref: (0, vue.unref)(forwardRef),
				onAutoScroll: _cache[0] || (_cache[0] = () => {
					const { viewport, selectedItem } = (0, vue.unref)(contentContext);
					if (viewport?.value && selectedItem?.value) viewport.value.scrollTop = viewport.value.scrollTop + selectedItem.value.offsetHeight;
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 512)) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Select/SelectScrollDownButton.vue
var SelectScrollDownButton_default = SelectScrollDownButton_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectScrollDownButton_default', {
  enumerable: true,
  get: function () {
    return SelectScrollDownButton_default;
  }
});
//# sourceMappingURL=SelectScrollDownButton.cjs.map