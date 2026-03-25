const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_utils = require('../RovingFocus/utils.cjs');
const require_Tree_TreeRoot = require('./TreeRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __tanstack_vue_virtual = require_rolldown_runtime.__toESM(require("@tanstack/vue-virtual"));

//#region src/Tree/TreeVirtualizer.vue?vue&type=script&setup=true&lang.ts
var TreeVirtualizer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TreeVirtualizer",
	props: {
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
		const rootContext = require_Tree_TreeRoot.injectTreeRootContext();
		const parentEl = (0, __vueuse_core.useParentElement)();
		const { getItems } = require_Collection_Collection.useCollection();
		const search = (0, __vueuse_core.refAutoReset)("", 1e3);
		const optionsWithMetadata = (0, vue.computed)(() => {
			const parseTextContent = (option) => {
				if (props.textContent) return props.textContent(option);
				else return option.toString().toLowerCase();
			};
			return rootContext.expandedItems.value.map((option, index) => ({
				index,
				textContent: parseTextContent(option.value)
			}));
		});
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
				return rootContext.expandedItems.value.length ?? 0;
			},
			get horizontal() {
				return false;
			},
			getItemKey(index) {
				return index + rootContext.getKey(rootContext.expandedItems.value[index].value);
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
			return {
				item,
				is: (0, vue.cloneVNode)(slots.default({
					item: rootContext.expandedItems.value[item.index],
					virtualizer: virtualizer.value,
					virtualItem: item
				})[0], {
					"data-index": item.index,
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
		function scrollToIndexAndFocus(index) {
			virtualizer.value.scrollToIndex(index, { align: "start" });
			requestAnimationFrame(() => {
				const item = parentEl.value.querySelector(`[data-index="${index}"]`);
				if (item instanceof HTMLElement) item.focus();
			});
		}
		rootContext.virtualKeydownHook.on((event) => {
			const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
			const isTabKey = event.key === "Tab" && !isMetaKey;
			if (isTabKey) return;
			const intent = require_RovingFocus_utils.MAP_KEY_TO_FOCUS_INTENT[event.key];
			if (["first", "last"].includes(intent)) {
				event.preventDefault();
				const index = intent === "first" ? 0 : rootContext.expandedItems.value.length - 1;
				virtualizer.value.scrollToIndex(index);
				requestAnimationFrame(() => {
					const items = getItems();
					const item = intent === "first" ? items[0] : items[items.length - 1];
					item.ref.focus();
				});
			} else if (intent === "prev" && event.key !== "ArrowUp") {
				const currentElement = require_shared_getActiveElement.getActiveElement();
				const currentIndex = Number(currentElement.getAttribute("data-index"));
				const currentLevel = Number(currentElement.getAttribute("data-indent"));
				const list = rootContext.expandedItems.value.slice(0, currentIndex).map((item, index) => ({
					...item,
					index
				})).reverse();
				const parentItem = list.find((item) => item.level === currentLevel - 1);
				if (parentItem) scrollToIndexAndFocus(parentItem.index);
			} else if (!intent && !isMetaKey) {
				search.value += event.key;
				const currentIndex = Number(require_shared_getActiveElement.getActiveElement()?.getAttribute("data-index"));
				const currentMatch = optionsWithMetadata.value[currentIndex].textContent;
				const filteredOptions = optionsWithMetadata.value.map((i) => i.textContent);
				const next = require_shared_useTypeahead.getNextMatch(filteredOptions, search.value, currentMatch);
				const nextMatch = optionsWithMetadata.value.find((option) => option.textContent === next);
				if (nextMatch) scrollToIndexAndFocus(nextMatch.index);
			}
			(0, vue.nextTick)(() => {
				if (event.shiftKey && intent) rootContext.handleMultipleReplace(intent, require_shared_getActiveElement.getActiveElement(), getItems, rootContext.expandedItems.value.map((i) => i.value));
			});
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
				return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)(is), { key: item.key });
			}), 128))], 4);
		};
	}
});

//#endregion
//#region src/Tree/TreeVirtualizer.vue
var TreeVirtualizer_default = TreeVirtualizer_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TreeVirtualizer_default', {
  enumerable: true,
  get: function () {
    return TreeVirtualizer_default;
  }
});
//# sourceMappingURL=TreeVirtualizer.cjs.map