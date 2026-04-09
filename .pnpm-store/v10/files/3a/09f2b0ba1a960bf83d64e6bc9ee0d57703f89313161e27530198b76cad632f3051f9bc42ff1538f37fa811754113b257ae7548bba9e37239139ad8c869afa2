const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useLocale = require('../shared/useLocale.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_color_convert = require('../color/convert.cjs');
const require_color_channel = require('../color/channel.cjs');
const require_color_parse = require('../color/parse.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ColorField/ColorFieldRoot.vue?vue&type=script&setup=true&lang.ts
const [injectColorFieldRootContext, provideColorFieldRootContext] = require_shared_createContext.createContext("ColorFieldRoot");
var ColorFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ColorFieldRoot",
	props: {
		modelValue: {
			type: [String, Object],
			required: false
		},
		defaultValue: {
			type: [String, Object],
			required: false,
			default: "#000000"
		},
		colorSpace: {
			type: String,
			required: false,
			default: "hsl"
		},
		channel: {
			type: String,
			required: false
		},
		placeholder: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		readonly: {
			type: Boolean,
			required: false,
			default: false
		},
		disableWheelChange: {
			type: Boolean,
			required: false,
			default: false
		},
		locale: {
			type: String,
			required: false
		},
		step: {
			type: Number,
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
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: ["update:modelValue", "update:color"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { colorSpace, channel, disabled, readonly, disableWheelChange, placeholder, locale: propLocale, step: stepProp } = (0, vue.toRefs)(props);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const locale = require_shared_useLocale.useLocale(propLocale);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const color = (0, vue.computed)({
			get: () => require_color_parse.normalizeColor(modelValue.value ?? "#000000"),
			set: (newColor) => {
				const hexString = require_color_convert.colorToString(newColor, "hex");
				modelValue.value = hexString;
				emits("update:color", newColor);
			}
		});
		const inputValue = (0, vue.ref)("");
		const isEditing = (0, vue.ref)(false);
		(0, vue.watch)(() => color.value, (newColor) => {
			if (!isEditing.value) inputValue.value = formatValue(newColor);
		}, { immediate: true });
		function formatValue(c) {
			if (channel.value) {
				const value = require_color_channel.getChannelValue(c, channel.value);
				if (channel.value === "alpha") return String(Math.round(value));
				return String(Math.round(value));
			}
			return require_color_convert.colorToString(c, "hex");
		}
		const MIN_HEX_INT = 0;
		const MAX_HEX_INT = 16777215;
		const PAGE_STEP_MULTIPLIER = 10;
		function getStep() {
			if (stepProp.value != null) return stepProp.value;
			if (channel.value) return require_color_channel.getChannelRange(channel.value).step;
			return 1;
		}
		function updateValue(value) {
			inputValue.value = value;
		}
		function commit() {
			isEditing.value = false;
			if (channel.value) {
				const numValue = parseFloat(inputValue.value);
				if (!isNaN(numValue)) {
					const range = require_color_channel.getChannelRange(channel.value);
					const clamped = Math.max(range.min, Math.min(range.max, numValue));
					color.value = require_color_channel.setChannelValue(color.value, channel.value, clamped);
				}
				inputValue.value = formatValue(color.value);
			} else {
				const trimmed = inputValue.value.trim();
				if (require_color_parse.isValidColor(trimmed)) color.value = require_color_parse.parseColor(trimmed);
				inputValue.value = formatValue(color.value);
			}
		}
		function addHexValue(delta) {
			const intDelta = Math.trunc(delta);
			const hexInt = color.value.space === "rgb" ? Math.round(color.value.r) << 16 | Math.round(color.value.g) << 8 | Math.round(color.value.b) : (() => {
				const rgb = require_color_convert.convertToRgb(color.value);
				return Math.round(rgb.r) << 16 | Math.round(rgb.g) << 8 | Math.round(rgb.b);
			})();
			const clamped = Math.min(Math.max(hexInt + intDelta, MIN_HEX_INT), MAX_HEX_INT);
			const hex = `#${clamped.toString(16).padStart(6, "0")}`;
			color.value = require_color_parse.parseColor(hex);
			inputValue.value = formatValue(color.value);
		}
		function increment() {
			if (disabled.value || readonly.value) return;
			const step = getStep();
			if (channel.value) {
				const currentValue = require_color_channel.getChannelValue(color.value, channel.value);
				color.value = require_color_channel.setChannelValue(color.value, channel.value, currentValue + step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(step);
		}
		function decrement() {
			if (disabled.value || readonly.value) return;
			const step = getStep();
			if (channel.value) {
				const currentValue = require_color_channel.getChannelValue(color.value, channel.value);
				color.value = require_color_channel.setChannelValue(color.value, channel.value, currentValue - step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(-step);
		}
		function incrementPage() {
			if (disabled.value || readonly.value) return;
			const step = getStep() * PAGE_STEP_MULTIPLIER;
			if (channel.value) {
				const currentValue = require_color_channel.getChannelValue(color.value, channel.value);
				color.value = require_color_channel.setChannelValue(color.value, channel.value, currentValue + step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(step);
		}
		function decrementPage() {
			if (disabled.value || readonly.value) return;
			const step = getStep() * PAGE_STEP_MULTIPLIER;
			if (channel.value) {
				const currentValue = require_color_channel.getChannelValue(color.value, channel.value);
				color.value = require_color_channel.setChannelValue(color.value, channel.value, currentValue - step);
				inputValue.value = formatValue(color.value);
			} else addHexValue(-step);
		}
		function incrementToMax() {
			if (disabled.value || readonly.value) return;
			if (channel.value) {
				const range = require_color_channel.getChannelRange(channel.value);
				color.value = require_color_channel.setChannelValue(color.value, channel.value, range.max);
				inputValue.value = formatValue(color.value);
			} else addHexValue(MAX_HEX_INT);
		}
		function decrementToMin() {
			if (disabled.value || readonly.value) return;
			if (channel.value) {
				const range = require_color_channel.getChannelRange(channel.value);
				color.value = require_color_channel.setChannelValue(color.value, channel.value, range.min);
				inputValue.value = formatValue(color.value);
			} else addHexValue(-MAX_HEX_INT);
		}
		function handleWheel(event) {
			if (disableWheelChange.value || disabled.value || readonly.value) return;
			event.preventDefault();
			if (event.deltaY > 0) decrement();
			else increment();
		}
		provideColorFieldRootContext({
			color: (0, vue.computed)(() => color.value),
			inputValue,
			channel,
			colorSpace,
			disabled,
			readonly,
			disableWheelChange,
			placeholder,
			updateValue,
			commit,
			increment,
			decrement,
			incrementToMax,
			decrementToMin,
			incrementPage,
			decrementPage,
			handleWheel
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "group",
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				"data-readonly": (0, vue.unref)(readonly) ? "" : void 0
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default"), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					type: "text",
					value: (0, vue.unref)(require_color_convert.colorToString)(color.value, "hex"),
					name: _ctx.name,
					disabled: (0, vue.unref)(disabled),
					required: _ctx.required
				}, null, 8, [
					"value",
					"name",
					"disabled",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-disabled",
				"data-readonly"
			]);
		};
	}
});

//#endregion
//#region src/ColorField/ColorFieldRoot.vue
var ColorFieldRoot_default = ColorFieldRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ColorFieldRoot_default', {
  enumerable: true,
  get: function () {
    return ColorFieldRoot_default;
  }
});
Object.defineProperty(exports, 'injectColorFieldRootContext', {
  enumerable: true,
  get: function () {
    return injectColorFieldRootContext;
  }
});
//# sourceMappingURL=ColorFieldRoot.cjs.map