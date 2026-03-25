const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const require_Menu_MenuContentImpl = require('./MenuContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuRootContentNonModal.vue?vue&type=script&setup=true&lang.ts
var MenuRootContentNonModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuRootContentNonModal",
	props: {
		loop: {
			type: Boolean,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
		reference: {
			type: null,
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		const menuContext = require_Menu_MenuRoot.injectMenuContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuContentImpl.MenuContentImpl_default, (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				"trap-focus": false,
				"disable-outside-pointer-events": false,
				"disable-outside-scroll": false,
				onDismiss: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(menuContext).onOpenChange(false))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Menu/MenuRootContentNonModal.vue
var MenuRootContentNonModal_default = MenuRootContentNonModal_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuRootContentNonModal_default', {
  enumerable: true,
  get: function () {
    return MenuRootContentNonModal_default;
  }
});
//# sourceMappingURL=MenuRootContentNonModal.cjs.map