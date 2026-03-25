const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Slider_SliderThumbImpl = require('./SliderThumbImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Slider/SliderThumb.vue?vue&type=script&setup=true&lang.ts
var SliderThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SliderThumb",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const { getItems } = require_Collection_Collection.useCollection();
		const { forwardRef, currentElement: thumbElement } = require_shared_useForwardExpose.useForwardExpose();
		const index = (0, vue.computed)(() => thumbElement.value ? getItems(true).findIndex((i) => i.ref === thumbElement.value) : -1);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Slider_SliderThumbImpl.SliderThumbImpl_default, (0, vue.mergeProps)({ ref: (0, vue.unref)(forwardRef) }, props, { index: index.value }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["index"]);
		};
	}
});

//#endregion
//#region src/Slider/SliderThumb.vue
var SliderThumb_default = SliderThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SliderThumb_default', {
  enumerable: true,
  get: function () {
    return SliderThumb_default;
  }
});
//# sourceMappingURL=SliderThumb.cjs.map