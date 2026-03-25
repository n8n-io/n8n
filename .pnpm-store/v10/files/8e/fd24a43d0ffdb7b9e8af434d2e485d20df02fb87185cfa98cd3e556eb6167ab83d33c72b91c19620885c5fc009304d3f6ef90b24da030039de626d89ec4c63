const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_RadioGroup_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/RadioGroup/Radio.vue?vue&type=script&setup=true&lang.ts
var Radio_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "Radio",
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
		checked: {
			type: Boolean,
			required: false,
			default: void 0
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
	emits: ["update:checked", "select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const checked = (0, __vueuse_core.useVModel)(props, "checked", emits, { passive: props.checked === void 0 });
		const { value } = (0, vue.toRefs)(props);
		const { forwardRef, currentElement: triggerElement } = require_shared_useForwardExpose.useForwardExpose();
		const isFormControl = require_shared_useFormControl.useFormControl(triggerElement);
		const ariaLabel = (0, vue.computed)(() => props.id && triggerElement.value ? document.querySelector(`[for="${props.id}"]`)?.innerText ?? props.value : void 0);
		function handleClick(event) {
			if (props.disabled) return;
			require_RadioGroup_utils.handleSelect(event, props.value, (ev) => {
				emits("select", ev);
				if (ev?.defaultPrevented) return;
				checked.value = true;
				if (isFormControl.value) ev.stopPropagation();
			});
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
				id: _ctx.id,
				ref: (0, vue.unref)(forwardRef),
				role: "radio",
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"aria-checked": (0, vue.unref)(checked),
				"aria-label": ariaLabel.value,
				"as-child": _ctx.asChild,
				disabled: _ctx.disabled ? "" : void 0,
				"data-state": (0, vue.unref)(checked) ? "checked" : "unchecked",
				"data-disabled": _ctx.disabled ? "" : void 0,
				value: (0, vue.unref)(value),
				required: _ctx.required,
				name: _ctx.name,
				onClick: (0, vue.withModifiers)(handleClick, ["stop"])
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { checked: (0, vue.unref)(checked) }), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					type: "radio",
					tabindex: "-1",
					value: (0, vue.unref)(value),
					checked: !!(0, vue.unref)(checked),
					name: _ctx.name,
					disabled: _ctx.disabled,
					required: _ctx.required
				}, null, 8, [
					"value",
					"checked",
					"name",
					"disabled",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 16, [
				"id",
				"type",
				"as",
				"aria-checked",
				"aria-label",
				"as-child",
				"disabled",
				"data-state",
				"data-disabled",
				"value",
				"required",
				"name"
			]);
		};
	}
});

//#endregion
//#region src/RadioGroup/Radio.vue
var Radio_default = Radio_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'Radio_default', {
  enumerable: true,
  get: function () {
    return Radio_default;
  }
});
//# sourceMappingURL=Radio.cjs.map