import { findValuesBetween } from "../shared/arrays.js";
import { getActiveElement } from "../shared/getActiveElement.js";
import { getNextMatch } from "../shared/useTypeahead.js";
import { useCollection } from "../Collection/Collection.js";
import { MAP_KEY_TO_FOCUS_INTENT } from "../RovingFocus/utils.js";
import { compare, queryCheckedElement } from "./utils.js";
import { injectListboxRootContext } from "./ListboxRoot.js";
import { Fragment, cloneVNode, computed, createBlock, createElementBlock, defineComponent, normalizeStyle, openBlock, renderList, resolveDynamicComponent, unref, useSlots } from "vue";
import { useParentElement } from "@vueuse/core";
import { refAutoReset as refAutoReset$1 } from "@vueuse/shared";
import { useVirtualizer } from "@tanstack/vue-virtual";

//#region src/Listbox/ListboxVirtualizer.vue?vue&type=script&setup=true&lang.ts
var ListboxVirtualizer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const slots = useSlots();
		const rootContext = injectListboxRootContext();
		const parentEl = useParentElement();
		const { getItems } = useCollection();
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
		const virtualizedItems = computed(() => virtualizer.value.getVirtualItems().map((item) => {
			const defaultNode = slots.default({
				option: props.options[item.index],
				virtualizer: virtualizer.value,
				virtualItem: item
			})[0];
			const targetNode = defaultNode.type === Fragment && Array.isArray(defaultNode.children) ? defaultNode.children[0] : defaultNode;
			return {
				item,
				is: cloneVNode(targetNode, {
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
				if (Array.isArray(rootContext.modelValue.value)) return compare(option, rootContext.modelValue.value[0], rootContext.by);
				else return compare(option, rootContext.modelValue.value, rootContext.by);
			});
			if (index !== -1) {
				event?.preventDefault();
				virtualizer.value.scrollToIndex(index, { align: "start" });
				requestAnimationFrame(() => {
					const item = queryCheckedElement(parentEl.value);
					if (item) {
						rootContext.changeHighlight(item);
						if (event) item?.focus();
					}
				});
			} else rootContext.highlightFirstItem();
		});
		rootContext.virtualHighlightHook.on((value) => {
			const index = props.options.findIndex((option) => {
				return compare(option, value, rootContext.by);
			});
			virtualizer.value.scrollToIndex(index, { align: "start" });
			requestAnimationFrame(() => {
				const item = queryCheckedElement(parentEl.value);
				if (item) rootContext.changeHighlight(item);
			});
		});
		const search = refAutoReset$1("", 1e3);
		const optionsWithMetadata = computed(() => {
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
					value = findValuesBetween(props.options, rootContext.firstValue.value, lastValue);
					break;
				}
				case "first": {
					value = findValuesBetween(props.options, rootContext.firstValue.value, props.options?.[0]);
					break;
				}
				case "last": {
					value = findValuesBetween(props.options, rootContext.firstValue.value, props.options?.[props.options.length - 1]);
					break;
				}
			}
			rootContext.modelValue.value = value;
		}
		rootContext.virtualKeydownHook.on((event) => {
			const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
			const isTabKey = event.key === "Tab" && !isMetaKey;
			if (isTabKey) return;
			let intent = MAP_KEY_TO_FOCUS_INTENT[event.key];
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
				const currentIndex = Number(getActiveElement()?.getAttribute("data-index"));
				const currentMatch = optionsWithMetadata.value[currentIndex].textContent;
				const filteredOptions = optionsWithMetadata.value.map((i) => i.textContent ?? "");
				const next = getNextMatch(filteredOptions, search.value, currentMatch);
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
			return openBlock(), createElementBlock("div", {
				"data-reka-virtualizer": "",
				style: normalizeStyle({
					position: "relative",
					width: "100%",
					height: `${unref(virtualizer).getTotalSize()}px`
				})
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(virtualizedItems.value, ({ is, item }) => {
				return openBlock(), createBlock(resolveDynamicComponent(is), { key: item.index });
			}), 128))], 4);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxVirtualizer.vue
var ListboxVirtualizer_default = ListboxVirtualizer_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ListboxVirtualizer_default };
//# sourceMappingURL=ListboxVirtualizer.js.map