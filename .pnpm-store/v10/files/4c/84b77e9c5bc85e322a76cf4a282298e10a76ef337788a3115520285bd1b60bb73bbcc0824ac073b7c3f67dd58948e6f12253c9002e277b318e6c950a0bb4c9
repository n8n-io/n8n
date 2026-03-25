const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Menu_MenuSub = require('../Menu/MenuSub.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/DropdownMenu/DropdownMenuSub.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuSub_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DropdownMenuSub",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const open = (0, __vueuse_core.useVModel)(props, "open", emit, {
			passive: props.open === void 0,
			defaultValue: props.defaultOpen ?? false
		});
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuSub.MenuSub_default), {
				open: (0, vue.unref)(open),
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => (0, vue.isRef)(open) ? open.value = $event : null)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { open: (0, vue.unref)(open) })]),
				_: 3
			}, 8, ["open"]);
		};
	}
});

//#endregion
//#region src/DropdownMenu/DropdownMenuSub.vue
var DropdownMenuSub_default = DropdownMenuSub_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DropdownMenuSub_default', {
  enumerable: true,
  get: function () {
    return DropdownMenuSub_default;
  }
});
//# sourceMappingURL=DropdownMenuSub.cjs.map