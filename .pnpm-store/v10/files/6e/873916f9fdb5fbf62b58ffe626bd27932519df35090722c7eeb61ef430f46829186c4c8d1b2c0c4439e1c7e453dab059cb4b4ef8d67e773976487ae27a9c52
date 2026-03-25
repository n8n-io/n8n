import type { InjectionKey, Ref } from 'vue';
export declare const defaultInitialZIndex = 2000;
export declare const zIndexContextKey: InjectionKey<Ref<number | undefined>>;
export declare const useZIndex: (zIndexOverrides?: Ref<number> | undefined) => {
    initialZIndex: import("vue").ComputedRef<number>;
    currentZIndex: import("vue").ComputedRef<number>;
    nextZIndex: () => number;
};
export declare type UseZIndexReturn = ReturnType<typeof useZIndex>;
