const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const require_Menu_MenuRootContentModal = require('./MenuRootContentModal.cjs');
const require_Menu_MenuRootContentNonModal = require('./MenuRootContentNonModal.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuContent.vue?vue&type=script&setup=true&lang.ts
var MenuContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
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
		const rootContext = require_Menu_MenuRoot.injectMenuRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(menuContext).open.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.unref)(rootContext).modal.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuRootContentModal.MenuRootContentModal_default, (0, vue.normalizeProps)((0, vue.mergeProps)({ key: 0 }, {
					..._ctx.$attrs,
					...(0, vue.unref)(forwarded)
				})), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16)) : ((0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuRootContentNonModal.MenuRootContentNonModal_default, (0, vue.normalizeProps)((0, vue.mergeProps)({ key: 1 }, {
					..._ctx.$attrs,
					...(0, vue.unref)(forwarded)
				})), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16))]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuContent.vue
var MenuContent_default = MenuContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuContent_default', {
  enumerable: true,
  get: function () {
    return MenuContent_default;
  }
});
//# sourceMappingURL=MenuContent.cjs.map