const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_Menu_MenuGroup = require('./MenuGroup.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Menu/MenuRadioGroup.vue?vue&type=script&setup=true&lang.ts
const [injectMenuRadioGroupContext, provideMenuRadioGroupContext] = require_shared_createContext.createContext("MenuRadioGroup");
var MenuRadioGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuRadioGroup",
	props: {
		modelValue: {
			type: String,
			required: false,
			default: ""
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits);
		provideMenuRadioGroupContext({
			modelValue,
			onValueChange: (payload) => {
				modelValue.value = payload;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuGroup.MenuGroup_default, (0, vue.normalizeProps)((0, vue.guardReactiveProps)(props)), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Menu/MenuRadioGroup.vue
var MenuRadioGroup_default = MenuRadioGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuRadioGroup_default', {
  enumerable: true,
  get: function () {
    return MenuRadioGroup_default;
  }
});
Object.defineProperty(exports, 'injectMenuRadioGroupContext', {
  enumerable: true,
  get: function () {
    return injectMenuRadioGroupContext;
  }
});
//# sourceMappingURL=MenuRadioGroup.cjs.map