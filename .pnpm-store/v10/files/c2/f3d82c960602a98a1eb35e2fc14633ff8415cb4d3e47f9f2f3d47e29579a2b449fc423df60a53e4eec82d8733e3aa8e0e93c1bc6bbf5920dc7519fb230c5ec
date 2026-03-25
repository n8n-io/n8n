const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_nullish = require('../shared/nullish.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Popper_PopperRoot = require('../Popper/PopperRoot.cjs');
const require_Select_BubbleSelect = require('./BubbleSelect.cjs');
const require_Select_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Select/SelectRoot.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = {
	key: 0,
	value: ""
};
const [injectSelectRootContext, provideSelectRootContext] = require_shared_createContext.createContext("SelectRoot");
var SelectRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "SelectRoot",
	props: {
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		defaultOpen: {
			type: Boolean,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		modelValue: {
			type: null,
			required: false,
			default: void 0
		},
		by: {
			type: [String, Function],
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		autocomplete: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
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
	emits: ["update:modelValue", "update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { required, disabled, multiple, dir: propDir } = (0, vue.toRefs)(props);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: props.modelValue === void 0,
			deep: true
		});
		const open = (0, __vueuse_core.useVModel)(props, "open", emits, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = (0, vue.ref)();
		const valueElement = (0, vue.ref)();
		const triggerPointerDownPosRef = (0, vue.ref)({
			x: 0,
			y: 0
		});
		const isEmptyModelValue = (0, vue.computed)(() => {
			if (multiple.value && Array.isArray(modelValue.value)) return modelValue.value?.length === 0;
			else return require_shared_nullish.isNullish(modelValue.value);
		});
		require_Collection_Collection.useCollection({ isProvider: true });
		const dir = require_shared_useDirection.useDirection(propDir);
		const isFormControl = require_shared_useFormControl.useFormControl(triggerElement);
		const optionsSet = (0, vue.ref)(/* @__PURE__ */ new Set());
		const nativeSelectKey = (0, vue.computed)(() => {
			return Array.from(optionsSet.value).map((option) => option.value).join(";");
		});
		function handleValueChange(value) {
			if (multiple.value) {
				const array = Array.isArray(modelValue.value) ? [...modelValue.value] : [];
				const index = array.findIndex((i) => require_Select_utils.compare(i, value, props.by));
				index === -1 ? array.push(value) : array.splice(index, 1);
				modelValue.value = [...array];
			} else modelValue.value = value;
		}
		function getOption(value) {
			return Array.from(optionsSet.value).find((option) => require_Select_utils.valueComparator(value, option.value, props.by));
		}
		provideSelectRootContext({
			triggerElement,
			onTriggerChange: (node) => {
				triggerElement.value = node;
			},
			valueElement,
			onValueElementChange: (node) => {
				valueElement.value = node;
			},
			contentId: "",
			modelValue,
			onValueChange: handleValueChange,
			by: props.by,
			open,
			multiple,
			required,
			onOpenChange: (value) => {
				open.value = value;
			},
			dir,
			triggerPointerDownPosRef,
			disabled,
			isEmptyModelValue,
			optionsSet,
			onOptionAdd: (option) => {
				const existingOption = getOption(option.value);
				if (existingOption) optionsSet.value.delete(existingOption);
				optionsSet.value.add(option);
			},
			onOptionRemove: (option) => {
				const existingOption = getOption(option.value);
				if (existingOption) optionsSet.value.delete(existingOption);
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperRoot.PopperRoot_default), null, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					open: (0, vue.unref)(open)
				}), (0, vue.unref)(isFormControl) ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Select_BubbleSelect.BubbleSelect_default, {
					key: nativeSelectKey.value,
					"aria-hidden": "true",
					tabindex: "-1",
					multiple: (0, vue.unref)(multiple),
					required: (0, vue.unref)(required),
					name: _ctx.name,
					autocomplete: _ctx.autocomplete,
					disabled: (0, vue.unref)(disabled),
					value: (0, vue.unref)(modelValue)
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.unref)(require_shared_nullish.isNullish)((0, vue.unref)(modelValue)) ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("option", _hoisted_1)) : (0, vue.createCommentVNode)("v-if", true), ((0, vue.openBlock)(true), (0, vue.createElementBlock)(vue.Fragment, null, (0, vue.renderList)(Array.from(optionsSet.value), (option) => {
						return (0, vue.openBlock)(), (0, vue.createElementBlock)("option", (0, vue.mergeProps)({ key: option.value ?? "" }, { ref_for: true }, option), null, 16);
					}), 128))]),
					_: 1
				}, 8, [
					"multiple",
					"required",
					"name",
					"autocomplete",
					"disabled",
					"value"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Select/SelectRoot.vue
var SelectRoot_default = SelectRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectRoot_default', {
  enumerable: true,
  get: function () {
    return SelectRoot_default;
  }
});
Object.defineProperty(exports, 'injectSelectRootContext', {
  enumerable: true,
  get: function () {
    return injectSelectRootContext;
  }
});
Object.defineProperty(exports, 'provideSelectRootContext', {
  enumerable: true,
  get: function () {
    return provideSelectRootContext;
  }
});
//# sourceMappingURL=SelectRoot.cjs.map