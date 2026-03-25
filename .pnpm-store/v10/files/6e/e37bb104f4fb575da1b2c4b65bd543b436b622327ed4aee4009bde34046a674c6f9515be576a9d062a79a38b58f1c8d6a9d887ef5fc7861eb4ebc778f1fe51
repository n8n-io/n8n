const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Menu_utils = require('./utils.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const require_Menu_MenuContentImpl = require('./MenuContentImpl.cjs');
const require_Menu_MenuSub = require('./MenuSub.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuSubContent.vue?vue&type=script&setup=true&lang.ts
var MenuSubContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuSubContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
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
			required: false,
			default: true
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
		const menuSubContext = require_Menu_MenuSub.injectMenuSubContext();
		const { forwardRef, currentElement: subContentElement } = require_shared_useForwardExpose.useForwardExpose();
		menuSubContext.contentId ||= require_shared_useId.useId(void 0, "reka-menu-sub-content");
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(menuContext).open.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_Menu_MenuContentImpl.MenuContentImpl_default, (0, vue.mergeProps)((0, vue.unref)(forwarded), {
					id: (0, vue.unref)(menuSubContext).contentId,
					ref: (0, vue.unref)(forwardRef),
					"aria-labelledby": (0, vue.unref)(menuSubContext).triggerId,
					align: "start",
					side: (0, vue.unref)(rootContext).dir.value === "rtl" ? "left" : "right",
					"disable-outside-pointer-events": false,
					"disable-outside-scroll": false,
					"trap-focus": false,
					onOpenAutoFocus: _cache[0] || (_cache[0] = (0, vue.withModifiers)((event) => {
						if ((0, vue.unref)(rootContext).isUsingKeyboardRef.value) (0, vue.unref)(subContentElement)?.focus();
					}, ["prevent"])),
					onCloseAutoFocus: _cache[1] || (_cache[1] = (0, vue.withModifiers)(() => {}, ["prevent"])),
					onFocusOutside: _cache[2] || (_cache[2] = (event) => {
						if (event.defaultPrevented) return;
						if (event.target !== (0, vue.unref)(menuSubContext).trigger.value) (0, vue.unref)(menuContext).onOpenChange(false);
					}),
					onEscapeKeyDown: _cache[3] || (_cache[3] = (event) => {
						(0, vue.unref)(rootContext).onClose();
						event.preventDefault();
					}),
					onKeydown: _cache[4] || (_cache[4] = (event) => {
						const isKeyDownInside = event.currentTarget?.contains(event.target);
						const isCloseKey = (0, vue.unref)(require_Menu_utils.SUB_CLOSE_KEYS)[(0, vue.unref)(rootContext).dir.value].includes(event.key);
						if (isKeyDownInside && isCloseKey) {
							(0, vue.unref)(menuContext).onOpenChange(false);
							(0, vue.unref)(menuSubContext).trigger.value?.focus();
							event.preventDefault();
						}
					})
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"aria-labelledby",
					"side"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuSubContent.vue
var MenuSubContent_default = MenuSubContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuSubContent_default', {
  enumerable: true,
  get: function () {
    return MenuSubContent_default;
  }
});
//# sourceMappingURL=MenuSubContent.cjs.map