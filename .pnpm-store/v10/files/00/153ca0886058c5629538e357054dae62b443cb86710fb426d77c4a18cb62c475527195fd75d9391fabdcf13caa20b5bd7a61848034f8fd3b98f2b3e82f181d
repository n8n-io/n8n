const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_RovingFocus_RovingFocusItem = require('../RovingFocus/RovingFocusItem.cjs');
const require_RadioGroup_Radio = require('./Radio.cjs');
const require_RadioGroup_RadioGroupRoot = require('./RadioGroupRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const ohash = require_rolldown_runtime.__toESM(require("ohash"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/RadioGroup/RadioGroupItem.vue?vue&type=script&setup=true&lang.ts
const [injectRadioGroupItemContext, provideRadiogroupItemContext] = require_shared_createContext.createContext("RadioGroupItem");
var RadioGroupItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "RadioGroupItem",
	props: {
		id: {
			type: String,
			required: false
		},
		value: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
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
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_RadioGroup_RadioGroupRoot.injectRadioGroupRootContext();
		const disabled = (0, vue.computed)(() => rootContext.disabled.value || props.disabled);
		const required = (0, vue.computed)(() => rootContext.required.value || props.required);
		const checked = (0, vue.computed)(() => (0, ohash.isEqual)(rootContext.modelValue?.value, props.value));
		provideRadiogroupItemContext({
			disabled,
			checked
		});
		const isArrowKeyPressed = (0, vue.ref)(false);
		const ARROW_KEYS = [
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight"
		];
		(0, __vueuse_core.useEventListener)("keydown", (event) => {
			if (ARROW_KEYS.includes(event.key)) isArrowKeyPressed.value = true;
		});
		(0, __vueuse_core.useEventListener)("keyup", () => {
			isArrowKeyPressed.value = false;
		});
		function handleFocus() {
			setTimeout(() => {
				/**
				* Our `RovingFocusGroup` will focus the radio when navigating with arrow keys
				* and we need to 'check' it in that case. We click it to 'check' it (instead
				* of updating `context.value`) so that the radio change event fires.
				*/
				if (isArrowKeyPressed.value) currentElement.value?.click();
			}, 0);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusItem.RovingFocusItem_default), {
				checked: checked.value,
				disabled: disabled.value,
				"as-child": "",
				focusable: !disabled.value,
				active: checked.value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_RadioGroup_Radio.Radio_default, (0, vue.mergeProps)({
					..._ctx.$attrs,
					...props
				}, {
					ref: (0, vue.unref)(forwardRef),
					checked: checked.value,
					required: required.value,
					disabled: disabled.value,
					"onUpdate:checked": _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).changeModelValue(_ctx.value)),
					onSelect: _cache[1] || (_cache[1] = ($event) => emits("select", $event)),
					onKeydown: _cache[2] || (_cache[2] = (0, vue.withKeys)((0, vue.withModifiers)(() => {}, ["prevent"]), ["enter"])),
					onFocus: handleFocus
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
						checked: checked.value,
						required: required.value,
						disabled: disabled.value
					})]),
					_: 3
				}, 16, [
					"checked",
					"required",
					"disabled"
				])]),
				_: 3
			}, 8, [
				"checked",
				"disabled",
				"focusable",
				"active"
			]);
		};
	}
});

//#endregion
//#region src/RadioGroup/RadioGroupItem.vue
var RadioGroupItem_default = RadioGroupItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'RadioGroupItem_default', {
  enumerable: true,
  get: function () {
    return RadioGroupItem_default;
  }
});
Object.defineProperty(exports, 'injectRadioGroupItemContext', {
  enumerable: true,
  get: function () {
    return injectRadioGroupItemContext;
  }
});
//# sourceMappingURL=RadioGroupItem.cjs.map