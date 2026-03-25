const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Menu_MenuContent = require('../Menu/MenuContent.cjs');
const require_ContextMenu_ContextMenuRoot = require('./ContextMenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ContextMenu/ContextMenuContent.vue?vue&type=script&setup=true&lang.ts
var ContextMenuContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ContextMenuContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false,
			default: 0
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false,
			default: true
		},
		collisionBoundary: {
			type: null,
			required: false,
			default: () => []
		},
		collisionPadding: {
			type: [Number, Object],
			required: false,
			default: 0
		},
		sticky: {
			type: String,
			required: false,
			default: "partial"
		},
		hideWhenDetached: {
			type: Boolean,
			required: false,
			default: false
		},
		positionStrategy: {
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
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_ContextMenu_ContextMenuRoot.injectContextMenuRootContext();
		const hasInteractedOutside = (0, vue.ref)(false);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuContent.MenuContent_default), (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				side: "right",
				"side-offset": 2,
				align: "start",
				"update-position-strategy": "always",
				style: {
					"--reka-context-menu-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-context-menu-content-available-width": "var(--reka-popper-available-width)",
					"--reka-context-menu-content-available-height": "var(--reka-popper-available-height)",
					"--reka-context-menu-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-context-menu-trigger-height": "var(--reka-popper-anchor-height)"
				},
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					if (!event.defaultPrevented && hasInteractedOutside.value) event.preventDefault();
					hasInteractedOutside.value = false;
				}),
				onInteractOutside: _cache[1] || (_cache[1] = (event) => {
					const originalEvent = event.detail.originalEvent;
					if (originalEvent.button === 2 && event.target === (0, vue.unref)(rootContext).triggerElement.value) event.preventDefault();
					if (!event.defaultPrevented && !(0, vue.unref)(rootContext).modal.value) hasInteractedOutside.value = true;
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuContent.vue
var ContextMenuContent_default = ContextMenuContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ContextMenuContent_default', {
  enumerable: true,
  get: function () {
    return ContextMenuContent_default;
  }
});
//# sourceMappingURL=ContextMenuContent.cjs.map