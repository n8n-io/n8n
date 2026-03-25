const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_shared_useNonce = require('../shared/useNonce.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ScrollArea/ScrollAreaViewport.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ScrollAreaViewport",
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
	setup(__props, { expose: __expose }) {
		const props = __props;
		const { nonce: propNonce } = (0, vue.toRefs)(props);
		const nonce = require_shared_useNonce.useNonce(propNonce);
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const viewportElement = (0, vue.ref)();
		(0, vue.onMounted)(() => {
			rootContext.onViewportChange(viewportElement.value);
			rootContext.onContentChange(contentElement.value);
		});
		__expose({ viewportElement });
		const { forwardRef, currentElement: contentElement } = require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [(0, vue.createElementVNode)("div", (0, vue.mergeProps)({
				ref_key: "viewportElement",
				ref: viewportElement,
				"data-reka-scroll-area-viewport": "",
				style: {
					overflowX: (0, vue.unref)(rootContext).scrollbarXEnabled.value ? "scroll" : "hidden",
					overflowY: (0, vue.unref)(rootContext).scrollbarYEnabled.value ? "scroll" : "hidden"
				}
			}, _ctx.$attrs, { tabindex: 0 }), [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				style: (0, vue.normalizeStyle)({ minWidth: (0, vue.unref)(rootContext).scrollbarXEnabled.value ? "fit-content" : void 0 }),
				"as-child": props.asChild,
				as: _ctx.as
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"style",
				"as-child",
				"as"
			])], 16), (0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: "style",
				nonce: (0, vue.unref)(nonce)
			}, {
				default: (0, vue.withCtx)(() => _cache[0] || (_cache[0] = [(0, vue.createTextVNode)(" /* Hide scrollbars cross-browser and enable momentum scroll for touch devices */ [data-reka-scroll-area-viewport] { scrollbar-width:none; -ms-overflow-style:none; -webkit-overflow-scrolling:touch; } [data-reka-scroll-area-viewport]::-webkit-scrollbar { display:none; } ")])),
				_: 1,
				__: [0]
			}, 8, ["nonce"])], 64);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaViewport.vue
var ScrollAreaViewport_default = ScrollAreaViewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaViewport_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaViewport_default;
  }
});
//# sourceMappingURL=ScrollAreaViewport.cjs.map