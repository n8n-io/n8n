const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Slot = require('../Primitive/Slot.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Collection/Collection.ts
const ITEM_DATA_ATTR = "data-reka-collection-item";
function useCollection(options = {}) {
	const { key = "", isProvider = false } = options;
	const injectionKey = `${key}CollectionProvider`;
	let context;
	if (isProvider) {
		const itemMap = (0, vue.ref)(/* @__PURE__ */ new Map());
		const collectionRef = (0, vue.ref)();
		context = {
			collectionRef,
			itemMap
		};
		(0, vue.provide)(injectionKey, context);
	} else context = (0, vue.inject)(injectionKey);
	const getItems = (includeDisabledItem = false) => {
		const collectionNode = context.collectionRef.value;
		if (!collectionNode) return [];
		const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
		const items = Array.from(context.itemMap.value.values());
		const orderedItems = items.sort((a, b) => orderedNodes.indexOf(a.ref) - orderedNodes.indexOf(b.ref));
		if (includeDisabledItem) return orderedItems;
		else return orderedItems.filter((i) => i.ref.dataset.disabled !== "");
	};
	const CollectionSlot = (0, vue.defineComponent)({
		name: "CollectionSlot",
		setup(_, { slots }) {
			const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
			(0, vue.watch)(currentElement, () => {
				context.collectionRef.value = currentElement.value;
			});
			return () => (0, vue.h)(require_Primitive_Slot.Slot, { ref: primitiveElement }, slots);
		}
	});
	const CollectionItem = (0, vue.defineComponent)({
		name: "CollectionItem",
		inheritAttrs: false,
		props: { value: { validator: () => true } },
		setup(props, { slots, attrs }) {
			const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
			(0, vue.watchEffect)((cleanupFn) => {
				if (currentElement.value) {
					const key$1 = (0, vue.markRaw)(currentElement.value);
					context.itemMap.value.set(key$1, {
						ref: currentElement.value,
						value: props.value
					});
					cleanupFn(() => context.itemMap.value.delete(key$1));
				}
			});
			return () => (0, vue.h)(require_Primitive_Slot.Slot, {
				...attrs,
				[ITEM_DATA_ATTR]: "",
				ref: primitiveElement
			}, slots);
		}
	});
	const reactiveItems = (0, vue.computed)(() => Array.from(context.itemMap.value.values()));
	const itemMapSize = (0, vue.computed)(() => context.itemMap.value.size);
	return {
		getItems,
		reactiveItems,
		itemMapSize,
		CollectionSlot,
		CollectionItem
	};
}

//#endregion
Object.defineProperty(exports, 'useCollection', {
  enumerable: true,
  get: function () {
    return useCollection;
  }
});
//# sourceMappingURL=Collection.cjs.map