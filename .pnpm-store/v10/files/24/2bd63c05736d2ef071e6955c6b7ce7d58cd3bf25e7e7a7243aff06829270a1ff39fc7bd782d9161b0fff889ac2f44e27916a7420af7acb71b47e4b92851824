const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_nullish = require('../shared/nullish.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Progress/ProgressRoot.vue?vue&type=script&setup=true&lang.ts
const DEFAULT_MAX = 100;
const [injectProgressRootContext, provideProgressRootContext] = require_shared_createContext.createContext("ProgressRoot");
const isNumber = (v) => typeof v === "number";
function validateValue(value, max) {
	const isValidValueError = require_shared_nullish.isNullish(value) || isNumber(value) && !Number.isNaN(value) && value <= max && value >= 0;
	if (isValidValueError) return value;
	console.error(`Invalid prop \`value\` of value \`${value}\` supplied to \`ProgressRoot\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${DEFAULT_MAX} if no \`max\` prop is set)
  - \`null\`  or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`);
	return null;
}
function validateMax(max) {
	const isValidMaxError = isNumber(max) && !Number.isNaN(max) && max > 0;
	if (isValidMaxError) return max;
	console.error(`Invalid prop \`max\` of value \`${max}\` supplied to \`ProgressRoot\`. Only numbers greater than 0 are valid max values. Defaulting to \`${DEFAULT_MAX}\`.`);
	return DEFAULT_MAX;
}
var ProgressRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ProgressRoot",
	props: {
		modelValue: {
			type: [Number, null],
			required: false
		},
		max: {
			type: Number,
			required: false,
			default: DEFAULT_MAX
		},
		getValueLabel: {
			type: Function,
			required: false,
			default: (value, max) => isNumber(value) ? `${Math.round(value / max * DEFAULT_MAX)}%` : void 0
		},
		getValueText: {
			type: Function,
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
	emits: ["update:modelValue", "update:max"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		require_shared_useForwardExpose.useForwardExpose();
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emit, { passive: props.modelValue === void 0 });
		const max = (0, __vueuse_core.useVModel)(props, "max", emit, { passive: props.max === void 0 });
		(0, vue.watch)(() => modelValue.value, async (value) => {
			const correctedValue = validateValue(value, props.max);
			if (correctedValue !== value) {
				await (0, vue.nextTick)();
				modelValue.value = correctedValue;
			}
		}, { immediate: true });
		(0, vue.watch)(() => props.max, (newMax) => {
			const correctedMax = validateMax(props.max);
			if (correctedMax !== newMax) max.value = correctedMax;
		}, { immediate: true });
		const progressState = (0, vue.computed)(() => {
			if (require_shared_nullish.isNullish(modelValue.value)) return "indeterminate";
			if (modelValue.value === max.value) return "complete";
			return "loading";
		});
		provideProgressRootContext({
			modelValue,
			max,
			progressState
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				"as-child": _ctx.asChild,
				as: _ctx.as,
				"aria-valuemax": (0, vue.unref)(max),
				"aria-valuemin": 0,
				"aria-valuenow": isNumber((0, vue.unref)(modelValue)) ? (0, vue.unref)(modelValue) : void 0,
				"aria-valuetext": _ctx.getValueText?.((0, vue.unref)(modelValue), (0, vue.unref)(max)),
				"aria-label": _ctx.getValueLabel((0, vue.unref)(modelValue), (0, vue.unref)(max)),
				role: "progressbar",
				"data-state": progressState.value,
				"data-value": (0, vue.unref)(modelValue) ?? void 0,
				"data-max": (0, vue.unref)(max)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"aria-valuemax",
				"aria-valuenow",
				"aria-valuetext",
				"aria-label",
				"data-state",
				"data-value",
				"data-max"
			]);
		};
	}
});

//#endregion
//#region src/Progress/ProgressRoot.vue
var ProgressRoot_default = ProgressRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ProgressRoot_default', {
  enumerable: true,
  get: function () {
    return ProgressRoot_default;
  }
});
Object.defineProperty(exports, 'injectProgressRootContext', {
  enumerable: true,
  get: function () {
    return injectProgressRootContext;
  }
});
//# sourceMappingURL=ProgressRoot.cjs.map