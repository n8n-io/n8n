const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/RovingFocus/RovingFocusGroup.vue?vue&type=script&setup=true&lang.ts
const [injectRovingFocusGroupContext, provideRovingFocusGroupContext] = require_shared_createContext.createContext("RovingFocusGroup");
var RovingFocusGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "RovingFocusGroup",
	props: {
		orientation: {
			type: String,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false,
			default: false
		},
		currentTabStopId: {
			type: [String, null],
			required: false
		},
		defaultCurrentTabStopId: {
			type: String,
			required: false
		},
		preventScrollOnEntryFocus: {
			type: Boolean,
			required: false,
			default: false
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
	emits: ["entryFocus", "update:currentTabStopId"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { loop, orientation, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const currentTabStopId = (0, __vueuse_core.useVModel)(props, "currentTabStopId", emits, {
			defaultValue: props.defaultCurrentTabStopId,
			passive: props.currentTabStopId === void 0
		});
		const isTabbingBackOut = (0, vue.ref)(false);
		const isClickFocus = (0, vue.ref)(false);
		const focusableItemsCount = (0, vue.ref)(0);
		const { getItems, CollectionSlot } = require_Collection_Collection.useCollection({ isProvider: true });
		function handleFocus(event) {
			const isKeyboardFocus = !isClickFocus.value;
			if (event.currentTarget && event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut.value) {
				const entryFocusEvent = new CustomEvent(require_RovingFocus_utils.ENTRY_FOCUS, require_RovingFocus_utils.EVENT_OPTIONS);
				event.currentTarget.dispatchEvent(entryFocusEvent);
				emits("entryFocus", entryFocusEvent);
				if (!entryFocusEvent.defaultPrevented) {
					const items = getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "");
					const activeItem = items.find((item) => item.getAttribute("data-active") === "");
					const highlightedItem = items.find((item) => item.getAttribute("data-highlighted") === "");
					const currentItem = items.find((item) => item.id === currentTabStopId.value);
					const candidateItems = [
						activeItem,
						highlightedItem,
						currentItem,
						...items
					].filter(Boolean);
					require_RovingFocus_utils.focusFirst(candidateItems, props.preventScrollOnEntryFocus);
				}
			}
			isClickFocus.value = false;
		}
		function handleMouseUp() {
			setTimeout(() => {
				isClickFocus.value = false;
			}, 1);
		}
		__expose({ getItems });
		provideRovingFocusGroupContext({
			loop,
			dir,
			orientation,
			currentTabStopId,
			onItemFocus: (tabStopId) => {
				currentTabStopId.value = tabStopId;
			},
			onItemShiftTab: () => {
				isTabbingBackOut.value = true;
			},
			onFocusableItemAdd: () => {
				focusableItemsCount.value++;
			},
			onFocusableItemRemove: () => {
				focusableItemsCount.value--;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionSlot), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					tabindex: isTabbingBackOut.value || focusableItemsCount.value === 0 ? -1 : 0,
					"data-orientation": (0, vue.unref)(orientation),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					dir: (0, vue.unref)(dir),
					style: { "outline": "none" },
					onMousedown: _cache[0] || (_cache[0] = ($event) => isClickFocus.value = true),
					onMouseup: handleMouseUp,
					onFocus: handleFocus,
					onBlur: _cache[1] || (_cache[1] = ($event) => isTabbingBackOut.value = false)
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"tabindex",
					"data-orientation",
					"as",
					"as-child",
					"dir"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/RovingFocus/RovingFocusGroup.vue
var RovingFocusGroup_default = RovingFocusGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'RovingFocusGroup_default', {
  enumerable: true,
  get: function () {
    return RovingFocusGroup_default;
  }
});
Object.defineProperty(exports, 'injectRovingFocusGroupContext', {
  enumerable: true,
  get: function () {
    return injectRovingFocusGroupContext;
  }
});
//# sourceMappingURL=RovingFocusGroup.cjs.map