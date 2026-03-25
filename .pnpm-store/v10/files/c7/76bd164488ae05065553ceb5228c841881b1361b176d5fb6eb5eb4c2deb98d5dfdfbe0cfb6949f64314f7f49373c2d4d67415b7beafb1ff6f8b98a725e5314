const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useSelectionBehavior = require('../shared/useSelectionBehavior.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RovingFocus_utils = require('../RovingFocus/utils.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const require_Tree_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Tree/TreeRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTreeRootContext, provideTreeRootContext] = require_shared_createContext.createContext("TreeRoot");
var TreeRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TreeRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		items: {
			type: Array,
			required: false
		},
		expanded: {
			type: Array,
			required: false
		},
		defaultExpanded: {
			type: Array,
			required: false
		},
		getKey: {
			type: Function,
			required: true
		},
		getChildren: {
			type: Function,
			required: false,
			default: (val) => val.children
		},
		selectionBehavior: {
			type: String,
			required: false,
			default: "toggle"
		},
		multiple: {
			type: Boolean,
			required: false,
			skipCheck: true
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		propagateSelect: {
			type: Boolean,
			required: false
		},
		bubbleSelect: {
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
			default: "ul"
		}
	},
	emits: ["update:modelValue", "update:expanded"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { items, multiple, disabled, propagateSelect, dir: propDir, bubbleSelect } = (0, vue.toRefs)(props);
		const { handleTypeaheadSearch } = require_shared_useTypeahead.useTypeahead();
		const dir = require_shared_useDirection.useDirection(propDir);
		const rovingFocusGroupRef = (0, vue.ref)();
		const isVirtual = (0, vue.ref)(false);
		const virtualKeydownHook = (0, __vueuse_core.createEventHook)();
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: true,
			deep: true
		});
		const expanded = (0, __vueuse_core.useVModel)(props, "expanded", emits, {
			defaultValue: props.defaultExpanded ?? [],
			passive: props.expanded === void 0,
			deep: true
		});
		const { onSelectItem, handleMultipleReplace } = require_shared_useSelectionBehavior.useSelectionBehavior(modelValue, props);
		const selectedKeys = (0, vue.computed)(() => {
			if (multiple.value && Array.isArray(modelValue.value)) return modelValue.value.map((i) => props.getKey(i));
			else return [props.getKey(modelValue.value ?? {})];
		});
		function flattenItems(items$1, level = 1, parentItem) {
			return items$1.reduce((acc, item, index) => {
				const key = props.getKey(item);
				const children = props.getChildren(item);
				const isExpanded = expanded.value.includes(key);
				const flattenedItem = {
					_id: key,
					value: item,
					index,
					level,
					parentItem,
					hasChildren: !!children,
					bind: {
						"value": item,
						level,
						"aria-setsize": items$1.length,
						"aria-posinset": index + 1
					}
				};
				acc.push(flattenedItem);
				if (children && isExpanded) acc.push(...flattenItems(children, level + 1, item));
				return acc;
			}, []);
		}
		const expandedItems = (0, vue.computed)(() => {
			const items$1 = props.items;
			const expandedKeys = expanded.value.map((i) => i);
			return flattenItems(items$1 ?? []);
		});
		function handleKeydown(event) {
			if (isVirtual.value) virtualKeydownHook.trigger(event);
			else {
				const collections = rovingFocusGroupRef.value?.getItems() ?? [];
				handleTypeaheadSearch(event.key, collections);
			}
		}
		function handleKeydownNavigation(event) {
			if (isVirtual.value) return;
			const intent = require_RovingFocus_utils.MAP_KEY_TO_FOCUS_INTENT[event.key];
			(0, vue.nextTick)(() => {
				handleMultipleReplace(intent, require_shared_getActiveElement.getActiveElement(), rovingFocusGroupRef.value?.getItems, expandedItems.value.map((i) => i.value));
			});
		}
		function handleBubbleSelect(item) {
			if (item.parentItem != null && Array.isArray(modelValue.value) && props.multiple) {
				const parentItem = expandedItems.value.find((i) => {
					return item.parentItem != null && props.getKey(i.value) === props.getKey(item.parentItem);
				});
				if (parentItem != null) {
					const areAllChilredOfParentSelected = props.getChildren(parentItem.value)?.every((i) => modelValue.value.find((v) => props.getKey(v) === props.getKey(i)));
					if (areAllChilredOfParentSelected) modelValue.value = [...modelValue.value, parentItem.value];
					else modelValue.value = modelValue.value.filter((v) => props.getKey(v) !== props.getKey(parentItem.value));
					handleBubbleSelect(parentItem);
				}
			}
		}
		provideTreeRootContext({
			modelValue,
			selectedKeys,
			onSelect: (val) => {
				const condition = (baseValue) => props.getKey(baseValue ?? {}) === props.getKey(val);
				const exist = props.multiple && Array.isArray(modelValue.value) ? modelValue.value?.findIndex(condition) !== -1 : void 0;
				onSelectItem(val, condition);
				if (props.bubbleSelect && props.multiple && Array.isArray(modelValue.value)) {
					const item = expandedItems.value.find((i) => {
						return props.getKey(i.value) === props.getKey(val);
					});
					if (item != null) handleBubbleSelect(item);
				}
				if (props.propagateSelect && props.multiple && Array.isArray(modelValue.value)) {
					const children = require_Tree_utils.flatten(props.getChildren(val) ?? []);
					if (exist) modelValue.value = [...modelValue.value].filter((i) => !children.some((child) => props.getKey(i ?? {}) === props.getKey(child)));
					else modelValue.value = [...modelValue.value, ...children];
				}
			},
			expanded,
			onToggle(val) {
				const children = val ? props.getChildren(val) : void 0;
				if (!children) return;
				const key = props.getKey(val) ?? val;
				if (expanded.value.includes(key)) expanded.value = expanded.value.filter((val$1) => val$1 !== key);
				else expanded.value.push(key);
			},
			getKey: props.getKey,
			getChildren: props.getChildren,
			items,
			expandedItems,
			disabled,
			multiple,
			dir,
			propagateSelect,
			bubbleSelect,
			isVirtual,
			virtualKeydownHook,
			handleMultipleReplace
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default), {
				ref_key: "rovingFocusGroupRef",
				ref: rovingFocusGroupRef,
				"as-child": "",
				orientation: "vertical",
				dir: (0, vue.unref)(dir)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					role: "tree",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-multiselectable": (0, vue.unref)(multiple) ? true : void 0,
					onKeydown: [handleKeydown, (0, vue.withKeys)((0, vue.withModifiers)(handleKeydownNavigation, ["shift"]), ["up", "down"])]
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
						flattenItems: expandedItems.value,
						modelValue: (0, vue.unref)(modelValue),
						expanded: (0, vue.unref)(expanded)
					})]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"aria-multiselectable",
					"onKeydown"
				])]),
				_: 3
			}, 8, ["dir"]);
		};
	}
});

//#endregion
//#region src/Tree/TreeRoot.vue
var TreeRoot_default = TreeRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TreeRoot_default', {
  enumerable: true,
  get: function () {
    return TreeRoot_default;
  }
});
Object.defineProperty(exports, 'injectTreeRootContext', {
  enumerable: true,
  get: function () {
    return injectTreeRootContext;
  }
});
//# sourceMappingURL=TreeRoot.cjs.map