import type { InjectionKey, Ref } from 'vue';
export declare const defaultNamespace = "el";
export declare const namespaceContextKey: InjectionKey<Ref<string | undefined>>;
export declare const useGetDerivedNamespace: (namespaceOverrides?: Ref<string | undefined> | undefined) => import("vue").ComputedRef<string>;
export declare const useNamespace: (block: string, namespaceOverrides?: Ref<string | undefined> | undefined) => {
    namespace: import("vue").ComputedRef<string>;
    b: (blockSuffix?: string) => string;
    e: (element?: string | undefined) => string;
    m: (modifier?: string | undefined) => string;
    be: (blockSuffix?: string | undefined, element?: string | undefined) => string;
    em: (element?: string | undefined, modifier?: string | undefined) => string;
    bm: (blockSuffix?: string | undefined, modifier?: string | undefined) => string;
    bem: (blockSuffix?: string | undefined, element?: string | undefined, modifier?: string | undefined) => string;
    is: {
        (name: string, state: boolean | undefined): string;
        (name: string): string;
    };
    cssVar: (object: Record<string, string>) => Record<string, string>;
    cssVarName: (name: string) => string;
    cssVarBlock: (object: Record<string, string>) => Record<string, string>;
    cssVarBlockName: (name: string) => string;
};
export declare type UseNamespaceReturn = ReturnType<typeof useNamespace>;
