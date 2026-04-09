const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_color_convert = require('../color/convert.cjs');
const require_color_parse = require('../color/parse.cjs');
const require_color_utils = require('../color/utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ColorSwatch/ColorSwatch.vue?vue&type=script&setup=true&lang.ts
var ColorSwatch_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ColorSwatch",
	props: {
		color: {
			type: [String, Object],
			required: false,
			default: ""
		},
		label: {
			type: String,
			required: false
		},
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
		const colorString = (0, vue.computed)(() => {
			if (!props.color) return "";
			if (typeof props.color === "string") return props.color;
			return require_color_convert.colorToString(props.color, "hex");
		});
		const colorObj = (0, vue.computed)(() => {
			if (!props.color) return null;
			try {
				return require_color_parse.normalizeColor(props.color);
			} catch {
				return null;
			}
		});
		const alpha = (0, vue.computed)(() => colorObj.value?.alpha ?? 0);
		const isNoColor = (0, vue.computed)(() => !props.color || alpha.value <= 0);
		const label = (0, vue.computed)(() => {
			if (props.label) return props.label;
			if (!colorObj.value || colorObj.value.alpha === 0) return "transparent";
			try {
				return require_color_utils.getColorName(colorString.value);
			} catch {
				return colorString.value || "transparent";
			}
		});
		const colorContrast = (0, vue.computed)(() => {
			try {
				return require_color_utils.getColorContrast(colorString.value);
			} catch {
				return void 0;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				role: "img",
				"aria-label": label.value,
				"aria-roledescription": "color swatch",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				"data-color-contrast": colorContrast.value,
				"data-no-color": isNoColor.value ? "" : void 0,
				style: (0, vue.normalizeStyle)({
					"--reka-color-swatch-color": colorString.value,
					"--reka-color-swatch-alpha": String(alpha.value)
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					color: colorString.value,
					alpha: alpha.value
				})]),
				_: 3
			}, 8, [
				"aria-label",
				"as-child",
				"as",
				"data-color-contrast",
				"data-no-color",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/ColorSwatch/ColorSwatch.vue
var ColorSwatch_default = ColorSwatch_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ColorSwatch_default', {
  enumerable: true,
  get: function () {
    return ColorSwatch_default;
  }
});
//# sourceMappingURL=ColorSwatch.cjs.map