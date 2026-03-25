const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const require_Combobox_ComboboxContentImpl = require('./ComboboxContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxContent.vue?vue&type=script&setup=true&lang.ts
var ComboboxContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		position: {
			type: String,
			required: false
		},
		bodyLock: {
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
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		rootContext.contentId ||= require_shared_useId.useId(void 0, "reka-combobox-content");
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(rootContext).open.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_Combobox_ComboboxContentImpl.ComboboxContentImpl_default, (0, vue.mergeProps)({
					...(0, vue.unref)(forwarded),
					..._ctx.$attrs
				}, { ref: (0, vue.unref)(forwardRef) }), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16)]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxContent.vue
var ComboboxContent_default = ComboboxContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxContent_default', {
  enumerable: true,
  get: function () {
    return ComboboxContent_default;
  }
});
//# sourceMappingURL=ComboboxContent.cjs.map