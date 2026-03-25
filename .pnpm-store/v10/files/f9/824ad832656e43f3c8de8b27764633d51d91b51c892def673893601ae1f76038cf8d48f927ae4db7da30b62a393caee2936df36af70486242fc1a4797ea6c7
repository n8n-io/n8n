const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Tooltip_TooltipRoot = require('./TooltipRoot.cjs');
const require_Tooltip_TooltipContentImpl = require('./TooltipContentImpl.cjs');
const require_Tooltip_TooltipContentHoverable = require('./TooltipContentHoverable.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Tooltip/TooltipContent.vue?vue&type=script&setup=true&lang.ts
var TooltipContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TooltipContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		ariaLabel: {
			type: String,
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
		side: {
			type: null,
			required: false,
			default: "top"
		},
		sideOffset: {
			type: Number,
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
		}
	},
	emits: ["escapeKeyDown", "pointerDownOutside"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Tooltip_TooltipRoot.injectTooltipRootContext();
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(rootContext).open.value }, {
				default: (0, vue.withCtx)(() => [((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(rootContext).disableHoverableContent.value ? require_Tooltip_TooltipContentImpl.TooltipContentImpl_default : require_Tooltip_TooltipContentHoverable.TooltipContentHoverable_default), (0, vue.mergeProps)({ ref: (0, vue.unref)(forwardRef) }, (0, vue.unref)(forwarded)), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16))]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipContent.vue
var TooltipContent_default = TooltipContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TooltipContent_default', {
  enumerable: true,
  get: function () {
    return TooltipContent_default;
  }
});
//# sourceMappingURL=TooltipContent.cjs.map