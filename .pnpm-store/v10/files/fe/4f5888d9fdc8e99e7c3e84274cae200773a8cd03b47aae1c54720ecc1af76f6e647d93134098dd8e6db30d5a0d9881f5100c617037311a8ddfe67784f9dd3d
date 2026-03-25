const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Collapsible/CollapsibleRoot.vue?vue&type=script&setup=true&lang.ts
const [injectCollapsibleRootContext, provideCollapsibleRootContext] = require_shared_createContext.createContext("CollapsibleRoot");
var CollapsibleRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CollapsibleRoot",
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
		disabled: {
			type: Boolean,
			required: false
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
		}
	},
	emits: ["update:open"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const open = (0, __vueuse_core.useVModel)(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const { disabled, unmountOnHide } = (0, vue.toRefs)(props);
		provideCollapsibleRootContext({
			contentId: "",
			disabled,
			open,
			unmountOnHide,
			onOpenToggle: () => {
				if (disabled.value) return;
				open.value = !open.value;
			}
		});
		__expose({ open });
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: _ctx.as,
				"as-child": props.asChild,
				"data-state": (0, vue.unref)(open) ? "open" : "closed",
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { open: (0, vue.unref)(open) })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-state",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/Collapsible/CollapsibleRoot.vue
var CollapsibleRoot_default = CollapsibleRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CollapsibleRoot_default', {
  enumerable: true,
  get: function () {
    return CollapsibleRoot_default;
  }
});
Object.defineProperty(exports, 'injectCollapsibleRootContext', {
  enumerable: true,
  get: function () {
    return injectCollapsibleRootContext;
  }
});
//# sourceMappingURL=CollapsibleRoot.cjs.map