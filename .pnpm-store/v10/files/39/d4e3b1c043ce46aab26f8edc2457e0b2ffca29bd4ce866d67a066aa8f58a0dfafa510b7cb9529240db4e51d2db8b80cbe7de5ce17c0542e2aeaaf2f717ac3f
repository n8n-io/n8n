const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_Popper_PopperRoot = require('../Popper/PopperRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Popover/PopoverRoot.vue?vue&type=script&setup=true&lang.ts
const [injectPopoverRootContext, providePopoverRootContext] = require_shared_createContext.createContext("PopoverRoot");
var PopoverRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PopoverRoot",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false,
			default: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		modal: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const { modal } = (0, vue.toRefs)(props);
		const open = (0, __vueuse_core.useVModel)(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = (0, vue.ref)();
		const hasCustomAnchor = (0, vue.ref)(false);
		providePopoverRootContext({
			contentId: "",
			triggerId: "",
			modal,
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			onOpenToggle: () => {
				open.value = !open.value;
			},
			triggerElement,
			hasCustomAnchor
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperRoot.PopperRoot_default), null, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					open: (0, vue.unref)(open),
					close: () => open.value = false
				})]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Popover/PopoverRoot.vue
var PopoverRoot_default = PopoverRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopoverRoot_default', {
  enumerable: true,
  get: function () {
    return PopoverRoot_default;
  }
});
Object.defineProperty(exports, 'injectPopoverRootContext', {
  enumerable: true,
  get: function () {
    return injectPopoverRootContext;
  }
});
//# sourceMappingURL=PopoverRoot.cjs.map