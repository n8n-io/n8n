import { ref, unref, provide, inject, onMounted, onBeforeUnmount } from 'vue';
import Collection from './collection2.mjs';
import CollectionItem from './collection-item.mjs';

const COLLECTION_ITEM_SIGN = `data-el-collection-item`;
const createCollectionWithScope = (name) => {
  const COLLECTION_NAME = `El${name}Collection`;
  const COLLECTION_ITEM_NAME = `${COLLECTION_NAME}Item`;
  const COLLECTION_INJECTION_KEY = Symbol(COLLECTION_NAME);
  const COLLECTION_ITEM_INJECTION_KEY = Symbol(COLLECTION_ITEM_NAME);
  const ElCollection = {
    ...Collection,
    name: COLLECTION_NAME,
    setup() {
      const collectionRef = ref(null);
      const itemMap = /* @__PURE__ */ new Map();
      const getItems = () => {
        const collectionEl = unref(collectionRef);
        if (!collectionEl)
          return [];
        const orderedNodes = Array.from(collectionEl.querySelectorAll(`[${COLLECTION_ITEM_SIGN}]`));
        const items = [...itemMap.values()];
        return items.sort((a, b) => orderedNodes.indexOf(a.ref) - orderedNodes.indexOf(b.ref));
      };
      provide(COLLECTION_INJECTION_KEY, {
        itemMap,
        getItems,
        collectionRef
      });
    }
  };
  const ElCollectionItem = {
    ...CollectionItem,
    name: COLLECTION_ITEM_NAME,
    setup(_, { attrs }) {
      const collectionItemRef = ref(null);
      const collectionInjection = inject(COLLECTION_INJECTION_KEY, void 0);
      provide(COLLECTION_ITEM_INJECTION_KEY, {
        collectionItemRef
      });
      onMounted(() => {
        const collectionItemEl = unref(collectionItemRef);
        if (collectionItemEl) {
          collectionInjection.itemMap.set(collectionItemEl, {
            ref: collectionItemEl,
            ...attrs
          });
        }
      });
      onBeforeUnmount(() => {
        const collectionItemEl = unref(collectionItemRef);
        collectionInjection.itemMap.delete(collectionItemEl);
      });
    }
  };
  return {
    COLLECTION_INJECTION_KEY,
    COLLECTION_ITEM_INJECTION_KEY,
    ElCollection,
    ElCollectionItem
  };
};

export { COLLECTION_ITEM_SIGN, createCollectionWithScope };
//# sourceMappingURL=collection.mjs.map
