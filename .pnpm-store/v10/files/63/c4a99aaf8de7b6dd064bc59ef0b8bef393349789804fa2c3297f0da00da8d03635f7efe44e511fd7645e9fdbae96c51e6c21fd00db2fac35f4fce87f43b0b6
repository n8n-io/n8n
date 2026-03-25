const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_shared_useNonce = require('../shared/useNonce.cjs');
const require_Select_utils = require('./utils.cjs');
const require_Select_SelectItemAlignedPosition = require('./SelectItemAlignedPosition.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectViewport.vue?vue&type=script&setup=true&lang.ts
var SelectViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SelectViewport",
	props: {
		nonce: {
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
		const { nonce: propNonce } = (0, vue.toRefs)(props);
		const nonce = require_shared_useNonce.useNonce(propNonce);
		const contentContext = require_Select_SelectContentImpl.injectSelectContentContext();
		const alignedPositionContext = contentContext.position === "item-aligned" ? require_Select_SelectItemAlignedPosition.injectSelectItemAlignedPositionContext() : void 0;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		(0, vue.onMounted)(() => {
			contentContext?.onViewportChange(currentElement.value);
		});
		const prevScrollTopRef = (0, vue.ref)(0);
		function handleScroll(event) {
			const viewport = event.currentTarget;
			const { shouldExpandOnScrollRef, contentWrapper } = alignedPositionContext ?? {};
			if (shouldExpandOnScrollRef?.value && contentWrapper?.value) {
				const scrolledBy = Math.abs(prevScrollTopRef.value - viewport.scrollTop);
				if (scrolledBy > 0) {
					const availableHeight = window.innerHeight - require_Select_utils.CONTENT_MARGIN * 2;
					const cssMinHeight = Number.parseFloat(contentWrapper.value.style.minHeight);
					const cssHeight = Number.parseFloat(contentWrapper.value.style.height);
					const prevHeight = Math.max(cssMinHeight, cssHeight);
					if (prevHeight < availableHeight) {
						const nextHeight = prevHeight + scrolledBy;
						const clampedNextHeight = Math.min(availableHeight, nextHeight);
						const heightDiff = nextHeight - clampedNextHeight;
						contentWrapper.value.style.height = `${clampedNextHeight}px`;
						if (contentWrapper.value.style.bottom === "0px") {
							viewport.scrollTop = heightDiff > 0 ? heightDiff : 0;
							contentWrapper.value.style.justifyContent = "flex-end";
						}
					}
				}
			}
			prevScrollTopRef.value = viewport.scrollTop;
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				ref: (0, vue.unref)(forwardRef),
				"data-reka-select-viewport": "",
				role: "presentation"
			}, {
				..._ctx.$attrs,
				...props
			}, {
				style: {
					position: "relative",
					flex: 1,
					overflow: "hidden auto"
				},
				onScroll: handleScroll
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16), (0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: "style",
				nonce: (0, vue.unref)(nonce)
			}, {
				default: (0, vue.withCtx)(() => _cache[0] || (_cache[0] = [(0, vue.createTextVNode)(" /* Hide scrollbars cross-browser and enable momentum scroll for touch devices */ [data-reka-select-viewport] { scrollbar-width:none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; } [data-reka-select-viewport]::-webkit-scrollbar { display: none; } ")])),
				_: 1,
				__: [0]
			}, 8, ["nonce"])], 64);
		};
	}
});

//#endregion
//#region src/Select/SelectViewport.vue
var SelectViewport_default = SelectViewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectViewport_default', {
  enumerable: true,
  get: function () {
    return SelectViewport_default;
  }
});
//# sourceMappingURL=SelectViewport.cjs.map