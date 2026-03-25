const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_handleAndDispatchCustomEvent = require('../shared/handleAndDispatchCustomEvent.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Select_utils = require('./utils.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectItem.vue?vue&type=script&setup=true&lang.ts
const [injectSelectItemContext, provideSelectItemContext] = require_shared_createContext.createContext("SelectItem");
var SelectItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SelectItem",
	props: {
		value: {
			type: null,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
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
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled } = (0, vue.toRefs)(props);
		const rootContext = require_Select_SelectRoot.injectSelectRootContext();
		const contentContext = require_Select_SelectContentImpl.injectSelectContentContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionItem } = require_Collection_Collection.useCollection();
		const isSelected = (0, vue.computed)(() => require_Select_utils.valueComparator(rootContext.modelValue?.value, props.value, rootContext.by));
		const isFocused = (0, vue.ref)(false);
		const textValue = (0, vue.ref)(props.textValue ?? "");
		const textId = require_shared_useId.useId(void 0, "reka-select-item-text");
		const SELECT_SELECT = "select.select";
		async function handleSelectCustomEvent(ev) {
			if (ev.defaultPrevented) return;
			const eventDetail = {
				originalEvent: ev,
				value: props.value
			};
			require_shared_handleAndDispatchCustomEvent.handleAndDispatchCustomEvent(SELECT_SELECT, handleSelect, eventDetail);
		}
		async function handleSelect(ev) {
			await (0, vue.nextTick)();
			emits("select", ev);
			if (ev.defaultPrevented) return;
			if (!disabled.value) {
				rootContext.onValueChange(props.value);
				if (!rootContext.multiple.value) rootContext.onOpenChange(false);
			}
		}
		async function handlePointerMove(event) {
			await (0, vue.nextTick)();
			if (event.defaultPrevented) return;
			if (disabled.value) contentContext.onItemLeave?.();
			else event.currentTarget?.focus({ preventScroll: true });
		}
		async function handlePointerLeave(event) {
			await (0, vue.nextTick)();
			if (event.defaultPrevented) return;
			if (event.currentTarget === require_shared_getActiveElement.getActiveElement()) contentContext.onItemLeave?.();
		}
		async function handleKeyDown(event) {
			await (0, vue.nextTick)();
			if (event.defaultPrevented) return;
			const isTypingAhead = contentContext.searchRef?.value !== "";
			if (isTypingAhead && event.key === " ") return;
			if (require_Select_utils.SELECTION_KEYS.includes(event.key)) handleSelectCustomEvent(event);
			if (event.key === " ") event.preventDefault();
		}
		if (props.value === "") throw new Error("A <SelectItem /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.");
		(0, vue.onMounted)(() => {
			if (!currentElement.value) return;
			contentContext.itemRefCallback(currentElement.value, props.value, props.disabled);
		});
		provideSelectItemContext({
			value: props.value,
			disabled,
			textId,
			isSelected,
			onItemTextChange: (node) => {
				textValue.value = ((textValue.value || node?.textContent) ?? "").trim();
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionItem), { value: { textValue: textValue.value } }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					role: "option",
					"aria-labelledby": (0, vue.unref)(textId),
					"data-highlighted": isFocused.value ? "" : void 0,
					"aria-selected": isSelected.value,
					"data-state": isSelected.value ? "checked" : "unchecked",
					"aria-disabled": (0, vue.unref)(disabled) || void 0,
					"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
					tabindex: (0, vue.unref)(disabled) ? void 0 : -1,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					onFocus: _cache[0] || (_cache[0] = ($event) => isFocused.value = true),
					onBlur: _cache[1] || (_cache[1] = ($event) => isFocused.value = false),
					onPointerup: handleSelectCustomEvent,
					onPointerdown: _cache[2] || (_cache[2] = (event) => {
						event.currentTarget.focus({ preventScroll: true });
					}),
					onTouchend: _cache[3] || (_cache[3] = (0, vue.withModifiers)(() => {}, ["prevent", "stop"])),
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onKeydown: handleKeyDown
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"aria-labelledby",
					"data-highlighted",
					"aria-selected",
					"data-state",
					"aria-disabled",
					"data-disabled",
					"tabindex",
					"as",
					"as-child"
				])]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/Select/SelectItem.vue
var SelectItem_default = SelectItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectItem_default', {
  enumerable: true,
  get: function () {
    return SelectItem_default;
  }
});
Object.defineProperty(exports, 'injectSelectItemContext', {
  enumerable: true,
  get: function () {
    return injectSelectItemContext;
  }
});
//# sourceMappingURL=SelectItem.cjs.map