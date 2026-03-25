const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/component/BaseSeparator.vue?vue&type=script&setup=true&lang.ts
var BaseSeparator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "BaseSeparator",
	props: {
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		decorative: {
			type: Boolean,
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
		const ORIENTATIONS = ["horizontal", "vertical"];
		function isValidOrientation(orientation) {
			return ORIENTATIONS.includes(orientation);
		}
		const computedOrientation = (0, vue.computed)(() => isValidOrientation(props.orientation) ? props.orientation : "horizontal");
		const ariaOrientation = (0, vue.computed)(() => computedOrientation.value === "vertical" ? props.orientation : void 0);
		const semanticProps = (0, vue.computed)(() => props.decorative ? { role: "none" } : {
			"aria-orientation": ariaOrientation.value,
			"role": "separator"
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-orientation": computedOrientation.value
			}, semanticProps.value), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"data-orientation"
			]);
		};
	}
});

//#endregion
//#region src/shared/component/BaseSeparator.vue
var BaseSeparator_default = BaseSeparator_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'BaseSeparator_default', {
  enumerable: true,
  get: function () {
    return BaseSeparator_default;
  }
});
//# sourceMappingURL=BaseSeparator.cjs.map