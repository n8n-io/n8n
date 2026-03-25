import { getActiveElement } from "../shared/getActiveElement.js";
import { getNextMatch } from "../shared/useTypeahead.js";
import { useCollection } from "../Collection/Collection.js";
import { MAP_KEY_TO_FOCUS_INTENT } from "../RovingFocus/utils.js";
import { injectTreeRootContext } from "./TreeRoot.js";
import { Fragment, cloneVNode, computed, createBlock, createElementBlock, defineComponent, nextTick, normalizeStyle, openBlock, renderList, resolveDynamicComponent, unref, useSlots } from "vue";
import { refAutoReset, useParentElement } from "@vueuse/core";
import { useVirtualizer } from "@tanstack/vue-virtual";

//#region src/Tree/TreeVirtualizer.vue?vue&type=script&setup=true&lang.ts
var TreeVirtualizer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const slots = useSlots();
		const rootContext = injectTreeRootContext();
		const parentEl = useParentElement();
		const { getItems } = useCollection();
		const search = refAutoReset("", 1e3);
		const optionsWithMetadata = computed(() => {
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
		const padding = computed(() => {
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
		const virtualizer = useVirtualizer({
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
		const virtualizedItems = computed(() => virtualizer.value.getVirtualItems().map((item) => {
			return {
				item,
				is: cloneVNode(slots.default({
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
			const intent = MAP_KEY_TO_FOCUS_INTENT[event.key];
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
				const currentElement = getActiveElement();
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
				const currentIndex = Number(getActiveElement()?.getAttribute("data-index"));
				const currentMatch = optionsWithMetadata.value[currentIndex].textContent;
				const filteredOptions = optionsWithMetadata.value.map((i) => i.textContent);
				const next = getNextMatch(filteredOptions, search.value, currentMatch);
				const nextMatch = optionsWithMetadata.value.find((option) => option.textContent === next);
				if (nextMatch) scrollToIndexAndFocus(nextMatch.index);
			}
			nextTick(() => {
				if (event.shiftKey && intent) rootContext.handleMultipleReplace(intent, getActiveElement(), getItems, rootContext.expandedItems.value.map((i) => i.value));
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				"data-reka-virtualizer": "",
				style: normalizeStyle({
					position: "relative",
					width: "100%",
					height: `${unref(virtualizer).getTotalSize()}px`
				})
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(virtualizedItems.value, ({ is, item }) => {
				return openBlock(), createBlock(resolveDynamicComponent(is), { key: item.key });
			}), 128))], 4);
		};
	}
});

//#endregion
//#region src/Tree/TreeVirtualizer.vue
var TreeVirtualizer_default = TreeVirtualizer_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TreeVirtualizer_default };
//# sourceMappingURL=TreeVirtualizer.js.map