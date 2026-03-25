const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_shared_useSingleOrMultipleValue = require('../shared/useSingleOrMultipleValue.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Accordion/AccordionRoot.vue?vue&type=script&setup=true&lang.ts
const [injectAccordionRootContext, provideAccordionRootContext] = require_shared_createContext.createContext("AccordionRoot");
var AccordionRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "AccordionRoot",
	props: {
		collapsible: {
			type: Boolean,
			required: false,
			default: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		dir: {
			type: String,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "vertical"
		},
		unmountOnHide: {
			type: Boolean,
			required: false,
			default: true
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		type: {
			type: String,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { dir, disabled, unmountOnHide } = (0, vue.toRefs)(props);
		const direction = require_shared_useDirection.useDirection(dir);
		const { modelValue, changeModelValue, isSingle } = require_shared_useSingleOrMultipleValue.useSingleOrMultipleValue(props, emits);
		const { forwardRef, currentElement: parentElement } = require_shared_useForwardExpose.useForwardExpose();
		provideAccordionRootContext({
			disabled,
			direction,
			orientation: props.orientation,
			parentElement,
			isSingle,
			collapsible: props.collapsible,
			modelValue,
			changeModelValue,
			unmountOnHide
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
				_: 3
			}, 8, ["as-child", "as"]);
		};
	}
});

//#endregion
//#region src/Accordion/AccordionRoot.vue
var AccordionRoot_default = AccordionRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'AccordionRoot_default', {
  enumerable: true,
  get: function () {
    return AccordionRoot_default;
  }
});
Object.defineProperty(exports, 'injectAccordionRootContext', {
  enumerable: true,
  get: function () {
    return injectAccordionRootContext;
  }
});
//# sourceMappingURL=AccordionRoot.cjs.map