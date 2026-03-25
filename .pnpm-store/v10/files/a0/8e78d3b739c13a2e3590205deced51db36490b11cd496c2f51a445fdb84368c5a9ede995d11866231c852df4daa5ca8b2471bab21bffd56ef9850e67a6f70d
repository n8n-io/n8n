const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_utils = require('./utils.cjs');
const require_RovingFocus_RovingFocusGroup = require('./RovingFocusGroup.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/RovingFocus/RovingFocusItem.vue?vue&type=script&setup=true&lang.ts
var RovingFocusItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "RovingFocusItem",
	props: {
		tabStopId: {
			type: String,
			required: false
		},
		focusable: {
			type: Boolean,
			required: false,
			default: true
		},
		active: {
			type: Boolean,
			required: false
		},
		allowShiftKey: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const context = require_RovingFocus_RovingFocusGroup.injectRovingFocusGroupContext();
		const randomId = require_shared_useId.useId();
		const id = (0, vue.computed)(() => props.tabStopId || randomId);
		const isCurrentTabStop = (0, vue.computed)(() => context.currentTabStopId.value === id.value);
		const { getItems, CollectionItem } = require_Collection_Collection.useCollection();
		(0, vue.onMounted)(() => {
			if (props.focusable) context.onFocusableItemAdd();
		});
		(0, vue.onUnmounted)(() => {
			if (props.focusable) context.onFocusableItemRemove();
		});
		function handleKeydown(event) {
			if (event.key === "Tab" && event.shiftKey) {
				context.onItemShiftTab();
				return;
			}
			if (event.target !== event.currentTarget) return;
			const focusIntent = require_RovingFocus_utils.getFocusIntent(event, context.orientation.value, context.dir.value);
			if (focusIntent !== void 0) {
				if (event.metaKey || event.ctrlKey || event.altKey || (props.allowShiftKey ? false : event.shiftKey)) return;
				event.preventDefault();
				let candidateNodes = [...getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "")];
				if (focusIntent === "last") candidateNodes.reverse();
				else if (focusIntent === "prev" || focusIntent === "next") {
					if (focusIntent === "prev") candidateNodes.reverse();
					const currentIndex = candidateNodes.indexOf(event.currentTarget);
					candidateNodes = context.loop.value ? require_RovingFocus_utils.wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
				}
				(0, vue.nextTick)(() => require_RovingFocus_utils.focusFirst(candidateNodes));
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionItem), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					tabindex: isCurrentTabStop.value ? 0 : -1,
					"data-orientation": (0, vue.unref)(context).orientation.value,
					"data-active": _ctx.active ? "" : void 0,
					"data-disabled": !_ctx.focusable ? "" : void 0,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					onMousedown: _cache[0] || (_cache[0] = (event) => {
						if (!_ctx.focusable) event.preventDefault();
						else (0, vue.unref)(context).onItemFocus(id.value);
					}),
					onFocus: _cache[1] || (_cache[1] = ($event) => (0, vue.unref)(context).onItemFocus(id.value)),
					onKeydown: handleKeydown
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"tabindex",
					"data-orientation",
					"data-active",
					"data-disabled",
					"as",
					"as-child"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/RovingFocus/RovingFocusItem.vue
var RovingFocusItem_default = RovingFocusItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'RovingFocusItem_default', {
  enumerable: true,
  get: function () {
    return RovingFocusItem_default;
  }
});
//# sourceMappingURL=RovingFocusItem.cjs.map