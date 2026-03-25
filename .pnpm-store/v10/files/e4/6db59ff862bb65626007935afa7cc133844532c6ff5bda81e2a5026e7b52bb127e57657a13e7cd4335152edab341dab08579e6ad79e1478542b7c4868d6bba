const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardProps = require('../shared/useForwardProps.cjs');
const require_shared_useGraceArea = require('../shared/useGraceArea.cjs');
const require_Tooltip_TooltipProvider = require('./TooltipProvider.cjs');
const require_Tooltip_TooltipRoot = require('./TooltipRoot.cjs');
const require_Tooltip_TooltipContentImpl = require('./TooltipContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Tooltip/TooltipContentHoverable.vue?vue&type=script&setup=true&lang.ts
var TooltipContentHoverable_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TooltipContentHoverable",
	props: {
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
			required: false
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
	setup(__props) {
		const props = __props;
		const forwardedProps = require_shared_useForwardProps.useForwardProps(props);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { trigger, onClose } = require_Tooltip_TooltipRoot.injectTooltipRootContext();
		const providerContext = require_Tooltip_TooltipProvider.injectTooltipProviderContext();
		const { isPointerInTransit, onPointerExit } = require_shared_useGraceArea.useGraceArea(trigger, currentElement);
		providerContext.isPointerInTransitRef = isPointerInTransit;
		onPointerExit(() => {
			onClose();
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Tooltip_TooltipContentImpl.TooltipContentImpl_default, (0, vue.mergeProps)({ ref: (0, vue.unref)(forwardRef) }, (0, vue.unref)(forwardedProps)), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipContentHoverable.vue
var TooltipContentHoverable_default = TooltipContentHoverable_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TooltipContentHoverable_default', {
  enumerable: true,
  get: function () {
    return TooltipContentHoverable_default;
  }
});
//# sourceMappingURL=TooltipContentHoverable.cjs.map