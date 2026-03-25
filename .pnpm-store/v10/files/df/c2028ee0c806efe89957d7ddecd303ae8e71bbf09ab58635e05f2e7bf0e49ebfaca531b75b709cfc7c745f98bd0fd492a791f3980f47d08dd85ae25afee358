const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_shared_useHideOthers = require('../shared/useHideOthers.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const require_Menu_MenuContentImpl = require('./MenuContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuRootContentModal.vue?vue&type=script&setup=true&lang.ts
var MenuRootContentModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuRootContentModal",
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
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		require_shared_useHideOthers.useHideOthers(currentElement);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuContentImpl.MenuContentImpl_default, (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				ref: (0, vue.unref)(forwardRef),
				"trap-focus": (0, vue.unref)(menuContext).open.value,
				"disable-outside-pointer-events": (0, vue.unref)(menuContext).open.value,
				"disable-outside-scroll": true,
				onDismiss: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(menuContext).onOpenChange(false)),
				onFocusOutside: _cache[1] || (_cache[1] = (0, vue.withModifiers)(($event) => emits("focusOutside", $event), ["prevent"]))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["trap-focus", "disable-outside-pointer-events"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuRootContentModal.vue
var MenuRootContentModal_default = MenuRootContentModal_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuRootContentModal_default', {
  enumerable: true,
  get: function () {
    return MenuRootContentModal_default;
  }
});
//# sourceMappingURL=MenuRootContentModal.cjs.map