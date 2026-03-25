import type { Ref } from 'vue';
export declare type CollectionItem<T = Record<string, any>> = {
    ref: HTMLElement | null;
} & T;
export declare type ElCollectionInjectionContext = {
    itemMap: Map<HTMLElement, CollectionItem>;
    getItems: <T>() => CollectionItem<T>[];
    collectionRef: Ref<HTMLElement | null>;
};
export declare type ElCollectionItemInjectionContext = {
    collectionItemRef: Ref<HTMLElement | null>;
};
