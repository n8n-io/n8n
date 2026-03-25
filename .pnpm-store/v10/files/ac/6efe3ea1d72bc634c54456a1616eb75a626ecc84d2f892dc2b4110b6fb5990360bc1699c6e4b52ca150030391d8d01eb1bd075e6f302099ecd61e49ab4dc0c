const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_handleAndDispatchCustomEvent = require('../shared/handleAndDispatchCustomEvent.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Listbox_utils = require('./utils.cjs');
const require_Listbox_ListboxRoot = require('./ListboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Listbox/ListboxItem.vue?vue&type=script&setup=true&lang.ts
const LISTBOX_SELECT = "listbox.select";
const [injectListboxItemContext, provideListboxItemContext] = require_shared_createContext.createContext("ListboxItem");
var ListboxItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ListboxItem",
	props: {
		value: {
			type: null,
			required: true
		},
		disabled: {
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
			default: "div"
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const id = require_shared_useId.useId(void 0, "reka-listbox-item");
		const { CollectionItem } = require_Collection_Collection.useCollection();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Listbox_ListboxRoot.injectListboxRootContext();
		const isHighlighted = (0, vue.computed)(() => currentElement.value === rootContext.highlightedElement.value);
		const isSelected = (0, vue.computed)(() => require_Listbox_utils.valueComparator(rootContext.modelValue.value, props.value, rootContext.by));
		const disabled = (0, vue.computed)(() => rootContext.disabled.value || props.disabled);
		async function handleSelect(ev) {
			emits("select", ev);
			if (ev?.defaultPrevented) return;
			if (!disabled.value && ev) {
				rootContext.onValueChange(props.value);
				rootContext.changeHighlight(currentElement.value);
			}
		}
		function handleSelectCustomEvent(ev) {
			const eventDetail = {
				originalEvent: ev,
				value: props.value
			};
			require_shared_handleAndDispatchCustomEvent.handleAndDispatchCustomEvent(LISTBOX_SELECT, handleSelect, eventDetail);
		}
		provideListboxItemContext({ isSelected });
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionItem), { value: _ctx.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.withMemo)([isHighlighted.value, isSelected.value], () => (0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({ id: (0, vue.unref)(id) }, _ctx.$attrs, {
					ref: (0, vue.unref)(forwardRef),
					role: "option",
					tabindex: (0, vue.unref)(rootContext).focusable.value ? isHighlighted.value ? "0" : "-1" : -1,
					"aria-selected": isSelected.value,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					disabled: disabled.value ? "" : void 0,
					"data-disabled": disabled.value ? "" : void 0,
					"data-highlighted": isHighlighted.value ? "" : void 0,
					"data-state": isSelected.value ? "checked" : "unchecked",
					onClick: handleSelectCustomEvent,
					onKeydown: (0, vue.withKeys)((0, vue.withModifiers)(handleSelectCustomEvent, ["prevent"]), ["space"]),
					onPointermove: _cache[0] || (_cache[0] = (event) => {
						if ((0, vue.unref)(rootContext).highlightedElement.value === (0, vue.unref)(currentElement)) return;
						if ((0, vue.unref)(rootContext).highlightOnHover.value) (0, vue.unref)(rootContext).changeHighlight((0, vue.unref)(currentElement), false);
						else (0, vue.unref)(rootContext).focusable.value || (0, vue.unref)(rootContext).changeHighlight((0, vue.unref)(currentElement), false);
					})
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"tabindex",
					"aria-selected",
					"as",
					"as-child",
					"disabled",
					"data-disabled",
					"data-highlighted",
					"data-state",
					"onKeydown"
				]), _cache, 1)]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxItem.vue
var ListboxItem_default = ListboxItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ListboxItem_default', {
  enumerable: true,
  get: function () {
    return ListboxItem_default;
  }
});
Object.defineProperty(exports, 'injectListboxItemContext', {
  enumerable: true,
  get: function () {
    return injectListboxItemContext;
  }
});
//# sourceMappingURL=ListboxItem.cjs.map