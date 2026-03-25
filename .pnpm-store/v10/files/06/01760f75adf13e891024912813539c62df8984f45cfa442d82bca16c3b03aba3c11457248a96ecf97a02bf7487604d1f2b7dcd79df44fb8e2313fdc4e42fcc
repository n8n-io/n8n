const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Teleport/Teleport.vue?vue&type=script&setup=true&lang.ts
var Teleport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "Teleport",
	props: {
		to: {
			type: null,
			required: false,
			default: "body"
		},
		disabled: {
			type: Boolean,
			required: false
		},
		defer: {
			type: Boolean,
			required: false
		},
		forceMount: {
			type: Boolean,
			required: false
		}
	},
	setup(__props) {
		const isMounted = (0, __vueuse_core.useMounted)();
		return (_ctx, _cache) => {
			return (0, vue.unref)(isMounted) || _ctx.forceMount ? ((0, vue.openBlock)(), (0, vue.createBlock)(vue.Teleport, {
				key: 0,
				to: _ctx.to,
				disabled: _ctx.disabled,
				defer: _ctx.defer
			}, [(0, vue.renderSlot)(_ctx.$slots, "default")], 8, [
				"to",
				"disabled",
				"defer"
			])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Teleport/Teleport.vue
var Teleport_default = Teleport_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'Teleport_default', {
  enumerable: true,
  get: function () {
    return Teleport_default;
  }
});
//# sourceMappingURL=Teleport.cjs.map