import { Primitive } from "../Primitive/Primitive.js";
import { colorToString } from "../color/convert.js";
import { normalizeColor } from "../color/parse.js";
import { getColorContrast, getColorName } from "../color/utils.js";
import { computed, createBlock, defineComponent, normalizeStyle, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ColorSwatch/ColorSwatch.vue?vue&type=script&setup=true&lang.ts
var ColorSwatch_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const colorString = computed(() => {
			if (!props.color) return "";
			if (typeof props.color === "string") return props.color;
			return colorToString(props.color, "hex");
		});
		const colorObj = computed(() => {
			if (!props.color) return null;
			try {
				return normalizeColor(props.color);
			} catch {
				return null;
			}
		});
		const alpha = computed(() => colorObj.value?.alpha ?? 0);
		const isNoColor = computed(() => !props.color || alpha.value <= 0);
		const label = computed(() => {
			if (props.label) return props.label;
			if (!colorObj.value || colorObj.value.alpha === 0) return "transparent";
			try {
				return getColorName(colorString.value);
			} catch {
				return colorString.value || "transparent";
			}
		});
		const colorContrast = computed(() => {
			try {
				return getColorContrast(colorString.value);
			} catch {
				return void 0;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				role: "img",
				"aria-label": label.value,
				"aria-roledescription": "color swatch",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				"data-color-contrast": colorContrast.value,
				"data-no-color": isNoColor.value ? "" : void 0,
				style: normalizeStyle({
					"--reka-color-swatch-color": colorString.value,
					"--reka-color-swatch-alpha": String(alpha.value)
				})
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
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
export { ColorSwatch_default };
//# sourceMappingURL=ColorSwatch.js.map