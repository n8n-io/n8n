const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_handleAndDispatchCustomEvent = require('../shared/handleAndDispatchCustomEvent.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_RovingFocusItem = require('../RovingFocus/RovingFocusItem.cjs');
const require_Tree_utils = require('./utils.cjs');
const require_Tree_TreeRoot = require('./TreeRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Tree/TreeItem.vue?vue&type=script&setup=true&lang.ts
const TREE_SELECT = "tree.select";
const TREE_TOGGLE = "tree.toggle";
var TreeItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "TreeItem",
	props: {
		value: {
			type: null,
			required: true
		},
		level: {
			type: Number,
			required: true
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "li"
		}
	},
	emits: ["select", "toggle"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Tree_TreeRoot.injectTreeRootContext();
		const { getItems } = require_Collection_Collection.useCollection();
		const hasChildren = (0, vue.computed)(() => !!rootContext.getChildren(props.value));
		const isExpanded = (0, vue.computed)(() => {
			const key = rootContext.getKey(props.value);
			return rootContext.expanded.value.includes(key);
		});
		const isSelected = (0, vue.computed)(() => {
			const key = rootContext.getKey(props.value);
			return rootContext.selectedKeys.value.includes(key);
		});
		const isIndeterminate = (0, vue.computed)(() => {
			if (rootContext.bubbleSelect.value && hasChildren.value && Array.isArray(rootContext.modelValue.value)) {
				const children = require_Tree_utils.flatten(rootContext.getChildren(props.value) || []);
				return children.some((child) => rootContext.modelValue.value.find((v) => rootContext.getKey(v) === rootContext.getKey(child))) && !children.every((child) => rootContext.modelValue.value.find((v) => rootContext.getKey(v) === rootContext.getKey(child)));
			} else if (rootContext.propagateSelect.value && isSelected.value && hasChildren.value && Array.isArray(rootContext.modelValue.value)) {
				const children = require_Tree_utils.flatten(rootContext.getChildren(props.value) || []);
				return !children.every((child) => rootContext.modelValue.value.find((v) => rootContext.getKey(v) === rootContext.getKey(child)));
			} else return void 0;
		});
		function handleKeydownRight(ev) {
			if (!hasChildren.value) return;
			if (isExpanded.value) {
				const collection = getItems().map((i) => i.ref);
				const currentElement = require_shared_getActiveElement.getActiveElement();
				const currentIndex = collection.indexOf(currentElement);
				const list = [...collection].slice(currentIndex);
				const nextElement = list.find((el) => Number(el.getAttribute("data-indent")) === props.level + 1);
				if (nextElement) nextElement.focus();
			} else handleToggleCustomEvent(ev);
		}
		function handleKeydownLeft(ev) {
			if (isExpanded.value) handleToggleCustomEvent(ev);
			else {
				const collection = getItems().map((i) => i.ref);
				const currentElement = require_shared_getActiveElement.getActiveElement();
				const currentIndex = collection.indexOf(currentElement);
				const list = [...collection].slice(0, currentIndex).reverse();
				const parentElement = list.find((el) => Number(el.getAttribute("data-indent")) === props.level - 1);
				if (parentElement) parentElement.focus();
			}
		}
		async function handleSelect(ev) {
			emits("select", ev);
			if (ev?.defaultPrevented) return;
			rootContext.onSelect(props.value);
		}
		async function handleToggle(ev) {
			emits("toggle", ev);
			if (ev?.defaultPrevented) return;
			rootContext.onToggle(props.value);
		}
		async function handleSelectCustomEvent(ev) {
			if (!ev) return;
			const eventDetail = {
				originalEvent: ev,
				value: props.value,
				isExpanded: isExpanded.value,
				isSelected: isSelected.value
			};
			require_shared_handleAndDispatchCustomEvent.handleAndDispatchCustomEvent(TREE_SELECT, handleSelect, eventDetail);
		}
		async function handleToggleCustomEvent(ev) {
			if (!ev) return;
			const eventDetail = {
				originalEvent: ev,
				value: props.value,
				isExpanded: isExpanded.value,
				isSelected: isSelected.value
			};
			require_shared_handleAndDispatchCustomEvent.handleAndDispatchCustomEvent(TREE_TOGGLE, handleToggle, eventDetail);
		}
		__expose({
			isExpanded,
			isSelected,
			isIndeterminate,
			handleToggle: () => rootContext.onToggle(props.value),
			handleSelect: () => rootContext.onSelect(props.value)
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusItem.RovingFocusItem_default), {
				"as-child": "",
				value: _ctx.value,
				"allow-shift-key": ""
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
					role: "treeitem",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-selected": isSelected.value,
					"aria-expanded": hasChildren.value ? isExpanded.value : void 0,
					"aria-level": _ctx.level,
					"data-indent": _ctx.level,
					"data-selected": isSelected.value ? "" : void 0,
					"data-expanded": isExpanded.value ? "" : void 0,
					onKeydown: [
						(0, vue.withKeys)((0, vue.withModifiers)(handleSelectCustomEvent, ["self", "prevent"]), ["enter", "space"]),
						_cache[0] || (_cache[0] = (0, vue.withKeys)((0, vue.withModifiers)((ev) => (0, vue.unref)(rootContext).dir.value === "ltr" ? handleKeydownRight(ev) : handleKeydownLeft(ev), ["prevent"]), ["right"])),
						_cache[1] || (_cache[1] = (0, vue.withKeys)((0, vue.withModifiers)((ev) => (0, vue.unref)(rootContext).dir.value === "ltr" ? handleKeydownLeft(ev) : handleKeydownRight(ev), ["prevent"]), ["left"]))
					],
					onClick: _cache[2] || (_cache[2] = (0, vue.withModifiers)((ev) => {
						handleSelectCustomEvent(ev);
						handleToggleCustomEvent(ev);
					}, ["stop"]))
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
						isExpanded: isExpanded.value,
						isSelected: isSelected.value,
						isIndeterminate: isIndeterminate.value,
						handleSelect: () => (0, vue.unref)(rootContext).onSelect(_ctx.value),
						handleToggle: () => (0, vue.unref)(rootContext).onToggle(_ctx.value)
					})]),
					_: 3
				}, 16, [
					"as",
					"as-child",
					"aria-selected",
					"aria-expanded",
					"aria-level",
					"data-indent",
					"data-selected",
					"data-expanded",
					"onKeydown"
				])]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/Tree/TreeItem.vue
var TreeItem_default = TreeItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TreeItem_default', {
  enumerable: true,
  get: function () {
    return TreeItem_default;
  }
});
//# sourceMappingURL=TreeItem.cjs.map