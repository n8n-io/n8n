const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_arrays = require('../shared/arrays.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_utils = require('../RovingFocus/utils.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_Listbox_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Listbox/ListboxRoot.vue?vue&type=script&setup=true&lang.ts
const [injectListboxRootContext, provideListboxRootContext] = require_shared_createContext.createContext("ListboxRoot");
var ListboxRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ListboxRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "vertical"
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		selectionBehavior: {
			type: String,
			required: false,
			default: "toggle"
		},
		highlightOnHover: {
			type: Boolean,
			required: false
		},
		by: {
			type: [String, Function],
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
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: [
		"update:modelValue",
		"highlight",
		"entryFocus",
		"leave"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { multiple, highlightOnHover, orientation, disabled, selectionBehavior, dir: propDir } = (0, vue.toRefs)(props);
		const { getItems } = require_Collection_Collection.useCollection({ isProvider: true });
		const { handleTypeaheadSearch } = require_shared_useTypeahead.useTypeahead();
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const kbd = require_shared_useKbd.useKbd();
		const dir = require_shared_useDirection.useDirection(propDir);
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const firstValue = (0, vue.ref)();
		const isUserAction = (0, vue.ref)(false);
		const focusable = (0, vue.ref)(true);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: props.modelValue === void 0,
			deep: true
		});
		function onValueChange(val) {
			isUserAction.value = true;
			if (props.multiple) {
				const modelArray = Array.isArray(modelValue.value) ? [...modelValue.value] : [];
				const index = modelArray.findIndex((i) => require_Listbox_utils.compare(i, val, props.by));
				if (props.selectionBehavior === "toggle") {
					index === -1 ? modelArray.push(val) : modelArray.splice(index, 1);
					modelValue.value = modelArray;
				} else {
					modelValue.value = [val];
					firstValue.value = val;
				}
			} else if (props.selectionBehavior === "toggle") if (require_Listbox_utils.compare(modelValue.value, val, props.by)) modelValue.value = void 0;
			else modelValue.value = val;
			else modelValue.value = val;
			setTimeout(() => {
				isUserAction.value = false;
			}, 1);
		}
		const highlightedElement = (0, vue.ref)(null);
		const previousElement = (0, vue.ref)(null);
		const isVirtual = (0, vue.ref)(false);
		const isComposing = (0, vue.ref)(false);
		const virtualFocusHook = (0, __vueuse_core.createEventHook)();
		const virtualKeydownHook = (0, __vueuse_core.createEventHook)();
		const virtualHighlightHook = (0, __vueuse_core.createEventHook)();
		function getCollectionItem() {
			return getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "");
		}
		function changeHighlight(el, scrollIntoView = true) {
			if (!el) return;
			highlightedElement.value = el;
			if (focusable.value) highlightedElement.value.focus();
			if (scrollIntoView) highlightedElement.value.scrollIntoView({ block: "nearest" });
			const highlightedItem = getItems().find((i) => i.ref === el);
			emits("highlight", highlightedItem);
		}
		function highlightItem(value) {
			if (isVirtual.value) virtualHighlightHook.trigger(value);
			else {
				const item = getItems().find((i) => require_Listbox_utils.compare(i.value, value, props.by));
				if (item) {
					highlightedElement.value = item.ref;
					changeHighlight(item.ref);
				}
			}
		}
		function onKeydownEnter(event) {
			if (highlightedElement.value && highlightedElement.value.isConnected) {
				event.preventDefault();
				event.stopPropagation();
				if (!isComposing.value) highlightedElement.value.click();
			}
		}
		function onKeydownTypeAhead(event) {
			if (!focusable.value) return;
			isUserAction.value = true;
			if (isVirtual.value) virtualKeydownHook.trigger(event);
			else {
				const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
				if (isMetaKey && event.key === "a" && multiple.value) {
					const collection = getItems();
					const values = collection.map((i) => i.value);
					modelValue.value = [...values];
					event.preventDefault();
					changeHighlight(collection[collection.length - 1].ref);
				} else if (!isMetaKey) {
					const el = handleTypeaheadSearch(event.key, getItems());
					if (el) changeHighlight(el);
				}
			}
			setTimeout(() => {
				isUserAction.value = false;
			}, 1);
		}
		function onCompositionStart() {
			isComposing.value = true;
		}
		function onCompositionEnd() {
			(0, vue.nextTick)(() => {
				isComposing.value = false;
			});
		}
		function highlightFirstItem() {
			(0, vue.nextTick)(() => {
				const event = new KeyboardEvent("keydown", { key: "PageUp" });
				onKeydownNavigation(event);
			});
		}
		function onLeave(event) {
			const el = highlightedElement.value;
			if (el?.isConnected) previousElement.value = el;
			highlightedElement.value = null;
			emits("leave", event);
		}
		function onEnter(event) {
			const entryFocusEvent = new CustomEvent("listbox.entryFocus", {
				bubbles: false,
				cancelable: true
			});
			event.currentTarget?.dispatchEvent(entryFocusEvent);
			emits("entryFocus", entryFocusEvent);
			if (entryFocusEvent.defaultPrevented) return;
			if (previousElement.value) changeHighlight(previousElement.value);
			else {
				const el = getCollectionItem()?.[0];
				changeHighlight(el);
			}
		}
		function onKeydownNavigation(event) {
			const intent = require_RovingFocus_utils.getFocusIntent(event, orientation.value, dir.value);
			if (!intent) return;
			let collection = getCollectionItem();
			if (highlightedElement.value) {
				if (intent === "last") collection.reverse();
				else if (intent === "prev" || intent === "next") {
					if (intent === "prev") collection.reverse();
					const currentIndex = collection.indexOf(highlightedElement.value);
					collection = collection.slice(currentIndex + 1);
				}
				handleMultipleReplace(event, collection[0]);
			}
			if (collection.length) {
				const index = !highlightedElement.value && intent === "prev" ? collection.length - 1 : 0;
				changeHighlight(collection[index]);
			}
			if (isVirtual.value) return virtualKeydownHook.trigger(event);
		}
		function handleMultipleReplace(event, targetEl) {
			if (isVirtual.value || props.selectionBehavior !== "replace" || !multiple.value || !Array.isArray(modelValue.value)) return;
			const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
			if (isMetaKey && !event.shiftKey) return;
			if (event.shiftKey) {
				const collection = getItems().filter((i) => i.ref.dataset.disabled !== "");
				let lastValue = collection.find((i) => i.ref === targetEl)?.value;
				if (event.key === kbd.END) lastValue = collection[collection.length - 1].value;
				else if (event.key === kbd.HOME) lastValue = collection[0].value;
				if (!lastValue || !firstValue.value) return;
				const values = require_shared_arrays.findValuesBetween(collection.map((i) => i.value), firstValue.value, lastValue);
				modelValue.value = values;
			}
		}
		async function highlightSelected(event) {
			await (0, vue.nextTick)();
			if (isVirtual.value) virtualFocusHook.trigger(event);
			else {
				const collection = getCollectionItem();
				const item = collection.find((i) => i.dataset.state === "checked");
				if (item) changeHighlight(item);
				else if (collection.length) changeHighlight(collection[0]);
			}
		}
		(0, vue.watch)(modelValue, () => {
			if (!isUserAction.value) (0, vue.nextTick)(() => {
				highlightSelected();
			});
		}, {
			immediate: true,
			deep: true
		});
		__expose({
			highlightedElement,
			highlightItem,
			highlightFirstItem,
			highlightSelected,
			getItems
		});
		provideListboxRootContext({
			modelValue,
			onValueChange,
			multiple,
			orientation,
			dir,
			disabled,
			highlightOnHover,
			highlightedElement,
			isVirtual,
			virtualFocusHook,
			virtualKeydownHook,
			virtualHighlightHook,
			by: props.by,
			firstValue,
			selectionBehavior,
			focusable,
			onLeave,
			onEnter,
			changeHighlight,
			onKeydownEnter,
			onKeydownNavigation,
			onKeydownTypeAhead,
			onCompositionStart,
			onCompositionEnd,
			highlightFirstItem
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				dir: (0, vue.unref)(dir),
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				onPointerleave: onLeave,
				onFocusout: _cache[0] || (_cache[0] = async (event) => {
					const target = event.relatedTarget || event.target;
					await (0, vue.nextTick)();
					if (highlightedElement.value && (0, vue.unref)(currentElement) && !(0, vue.unref)(currentElement).contains(target)) onLeave(event);
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) }), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					name: _ctx.name,
					value: (0, vue.unref)(modelValue),
					disabled: (0, vue.unref)(disabled),
					required: _ctx.required
				}, null, 8, [
					"name",
					"value",
					"disabled",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"dir",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxRoot.vue
var ListboxRoot_default = ListboxRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ListboxRoot_default', {
  enumerable: true,
  get: function () {
    return ListboxRoot_default;
  }
});
Object.defineProperty(exports, 'injectListboxRootContext', {
  enumerable: true,
  get: function () {
    return injectListboxRootContext;
  }
});
//# sourceMappingURL=ListboxRoot.cjs.map