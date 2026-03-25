'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var collection = require('./collection2.js');
var collectionItem = require('./collection-item.js');

const COLLECTION_ITEM_SIGN = `data-el-collection-item`;
const createCollectionWithScope = (name) => {
  const COLLECTION_NAME = `El${name}Collection`;
  const COLLECTION_ITEM_NAME = `${COLLECTION_NAME}Item`;
  const COLLECTION_INJECTION_KEY = Symbol(COLLECTION_NAME);
  const COLLECTION_ITEM_INJECTION_KEY = Symbol(COLLECTION_ITEM_NAME);
  const ElCollection = {
    ...collection["default"],
    name: COLLECTION_NAME,
    setup() {
      const collectionRef = vue.ref(null);
      const itemMap = /* @__PURE__ */ new Map();
      const getItems = () => {
        const collectionEl = vue.unref(collectionRef);
        if (!collectionEl)
          return [];
        const orderedNodes = Array.from(collectionEl.querySelectorAll(`[${COLLECTION_ITEM_SIGN}]`));
        const items = [...itemMap.values()];
        return items.sort((a, b) => orderedNodes.indexOf(a.ref) - orderedNodes.indexOf(b.ref));
      };
      vue.provide(COLLECTION_INJECTION_KEY, {
        itemMap,
        getItems,
        collectionRef
      });
    }
  };
  const ElCollectionItem = {
    ...collectionItem["default"],
    name: COLLECTION_ITEM_NAME,
    setup(_, { attrs }) {
      const collectionItemRef = vue.ref(null);
      const collectionInjection = vue.inject(COLLECTION_INJECTION_KEY, void 0);
      vue.provide(COLLECTION_ITEM_INJECTION_KEY, {
        collectionItemRef
      });
      vue.onMounted(() => {
        const collectionItemEl = vue.unref(collectionItemRef);
        if (collectionItemEl) {
          collectionInjection.itemMap.set(collectionItemEl, {
            ref: collectionItemEl,
            ...attrs
          });
        }
      });
      vue.onBeforeUnmount(() => {
        const collectionItemEl = vue.unref(collectionItemRef);
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

exports.COLLECTION_ITEM_SIGN = COLLECTION_ITEM_SIGN;
exports.createCollectionWithScope = createCollectionWithScope;
//# sourceMappingURL=collection.js.map
