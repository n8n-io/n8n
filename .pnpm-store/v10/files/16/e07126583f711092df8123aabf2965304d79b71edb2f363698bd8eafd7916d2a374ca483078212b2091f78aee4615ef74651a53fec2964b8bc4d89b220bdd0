const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_arrays = require('../shared/arrays.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_utils = require('../RovingFocus/utils.cjs');
const require_Listbox_utils = require('./utils.cjs');
const require_Listbox_ListboxRoot = require('./ListboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));
const __tanstack_vue_virtual = require_rolldown_runtime.__toESM(require("@tanstack/vue-virtual"));

//#region src/Listbox/ListboxVirtualizer.vue?vue&type=script&setup=true&lang.ts
var ListboxVirtualizer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ListboxVirtualizer",
	props: {
		options: {
			type: Array,
			required: true
		},
		overscan: {
			type: Number,
			required: false
		},
		estimateSize: {
			type: Number,
			required: false
		},
		textContent: {
			type: Function,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const slots = (0, vue.useSlots)();
		const rootContext = require_Listbox_ListboxRoot.injectListboxRootContext();
		const parentEl = (0, __vueuse_core.useParentElement)();
		const { getItems } = require_Collection_Collection.useCollection();
		rootContext.isVirtual.value = true;
		const padding = (0, vue.computed)(() => {
			const el = parentEl.value;
			if (!el) return {
				start: 0,
				end: 0
			};
			else {
				const styles = window.getComputedStyle(el);
				return {
					start: Number.parseFloat(styles.paddingBlockStart || styles.paddingTop),
					end: Number.parseFloat(styles.paddingBlockEnd || styles.paddingBottom)
				};
			}
		});
		const virtualizer = (0, __tanstack_vue_virtual.useVirtualizer)({
			get scrollPaddingStart() {
				return padding.value.start;
			},
			get scrollPaddingEnd() {
				return padding.value.end;
			},
			get count() {
				return props.options.length;
			},
			get horizontal() {
				return rootContext.orientation.value === "horizontal";
			},
			estimateSize() {
				return props.estimateSize ?? 28;
			},
			getScrollElement() {
				return parentEl.value;
			},
			overscan: props.overscan ?? 12
		});
		const virtualizedItems = (0, vue.computed)(() => virtualizer.value.getVirtualItems().map((item) => {
			const defaultNode = slots.default({
				option: props.options[item.index],
				virtualizer: virtualizer.value,
				virtualItem: item
			})[0];
			const targetNode = defaultNode.type === vue.Fragment && Array.isArray(defaultNode.children) ? defaultNode.children[0] : defaultNode;
			return {
				item,
				is: (0, vue.cloneVNode)(targetNode, {
					"key": `${item.key}`,
					"data-index": item.index,
					"aria-setsize": props.options.length,
					"aria-posinset": item.index + 1,
					"style": {
						position: "absolute",
						top: 0,
						left: 0,
						transform: `translateY(${item.start}px)`,
						overflowAnchor: "none"
					}
				})
			};
		}));
		rootContext.virtualFocusHook.on((event) => {
			const index = props.options.findIndex((option) => {
				if (Array.isArray(rootContext.modelValue.value)) return require_Listbox_utils.compare(option, rootContext.modelValue.value[0], rootContext.by);
				else return require_Listbox_utils.compare(option, rootContext.modelValue.value, rootContext.by);
			});
			if (index !== -1) {
				event?.preventDefault();
				virtualizer.value.scrollToIndex(index, { align: "start" });
				requestAnimationFrame(() => {
					const item = require_Listbox_utils.queryCheckedElement(parentEl.value);
					if (item) {
						rootContext.changeHighlight(item);
						if (event) item?.focus();
					}
				});
			} else rootContext.highlightFirstItem();
		});
		rootContext.virtualHighlightHook.on((value) => {
			const index = props.options.findIndex((option) => {
				return require_Listbox_utils.compare(option, value, rootContext.by);
			});
			virtualizer.value.scrollToIndex(index, { align: "start" });
			requestAnimationFrame(() => {
				const item = require_Listbox_utils.queryCheckedElement(parentEl.value);
				if (item) rootContext.changeHighlight(item);
			});
		});
		const search = (0, __vueuse_shared.refAutoReset)("", 1e3);
		const optionsWithMetadata = (0, vue.computed)(() => {
			const parseTextContent = (option) => {
				if (props.textContent) return props.textContent(option);
				else return option?.toString().toLowerCase();
			};
			return props.options.map((option, index) => ({
				index,
				textContent: parseTextContent(option)
			}));
		});
		function handleMultipleReplace(event, intent) {
			if (!rootContext.firstValue?.value || !rootContext.multiple.value || !Array.isArray(rootContext.modelValue.value)) return;
			const collection = getItems().filter((i) => i.ref.dataset.disabled !== "");
			const lastValue = collection.find((i) => i.ref === rootContext.highlightedElement.value)?.value;
			if (!lastValue) return;
			let value = null;
			switch (intent) {
				case "prev":
				case "next": {
					value = require_shared_arrays.findValuesBetween(props.options, rootContext.firstValue.value, lastValue);
					break;
				}
				case "first": {
					value = require_shared_arrays.findValuesBetween(props.options, rootContext.firstValue.value, props.options?.[0]);
					break;
				}
				case "last": {
					value = require_shared_arrays.findValuesBetween(props.options, rootContext.firstValue.value, props.options?.[props.options.length - 1]);
					break;
				}
			}
			rootContext.modelValue.value = value;
		}
		rootContext.virtualKeydownHook.on((event) => {
			const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
			const isTabKey = event.key === "Tab" && !isMetaKey;
			if (isTabKey) return;
			let intent = require_RovingFocus_utils.MAP_KEY_TO_FOCUS_INTENT[event.key];
			if (isMetaKey && event.key === "a" && rootContext.multiple.value) {
				event.preventDefault();
				rootContext.modelValue.value = [...props.options];
				intent = "last";
			} else if (event.shiftKey && intent) handleMultipleReplace(event, intent);
			if (["first", "last"].includes(intent)) {
				event.preventDefault();
				const index = intent === "first" ? 0 : props.options.length - 1;
				virtualizer.value.scrollToIndex(index);
				requestAnimationFrame(() => {
					const items = getItems();
					const item = intent === "first" ? items[0] : items[items.length - 1];
					if (item) rootContext.changeHighlight(item.ref);
				});
			} else if (!intent && !isMetaKey) {
				search.value += event.key;
				const currentIndex = Number(require_shared_getActiveElement.getActiveElement()?.getAttribute("data-index"));
				const currentMatch = optionsWithMetadata.value[currentIndex].textContent;
				const filteredOptions = optionsWithMetadata.value.map((i) => i.textContent ?? "");
				const next = require_shared_useTypeahead.getNextMatch(filteredOptions, search.value, currentMatch);
				const nextMatch = optionsWithMetadata.value.find((option) => option.textContent === next);
				if (nextMatch) {
					virtualizer.value.scrollToIndex(nextMatch.index, { align: "start" });
					requestAnimationFrame(() => {
						const item = parentEl.value.querySelector(`[data-index="${nextMatch.index}"]`);
						if (item instanceof HTMLElement) rootContext.changeHighlight(item);
					});
				}
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", {
				"data-reka-virtualizer": "",
				style: (0, vue.normalizeStyle)({
					position: "relative",
					width: "100%",
					height: `${(0, vue.unref)(virtualizer).getTotalSize()}px`
				})
			}, [((0, vue.openBlock)(true), (0, vue.createElementBlock)(vue.Fragment, null, (0, vue.renderList)(virtualizedItems.value, ({ is, item }) => {
				return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)(is), { key: item.index });
			}), 128))], 4);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxVirtualizer.vue
var ListboxVirtualizer_default = ListboxVirtualizer_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ListboxVirtualizer_default', {
  enumerable: true,
  get: function () {
    return ListboxVirtualizer_default;
  }
});
//# sourceMappingURL=ListboxVirtualizer.cjs.map