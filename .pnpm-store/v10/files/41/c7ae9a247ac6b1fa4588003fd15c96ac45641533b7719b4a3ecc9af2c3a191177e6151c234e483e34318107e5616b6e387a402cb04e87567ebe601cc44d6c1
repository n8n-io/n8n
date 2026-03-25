import type { MaybeRef } from '@vueuse/core';
import type { App, Ref } from 'vue';
import type { ConfigProviderContext } from '../constants';
export declare function useGlobalConfig<K extends keyof ConfigProviderContext, D extends ConfigProviderContext[K]>(key: K, defaultValue?: D): Ref<Exclude<ConfigProviderContext[K], undefined> | D>;
export declare function useGlobalConfig(): Ref<ConfigProviderContext>;
export declare function useGlobalComponentSettings(block: string, sizeFallback?: MaybeRef<ConfigProviderContext['size']>): {
    ns: {
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
    locale: import("element-plus/es/hooks").LocaleContext;
    zIndex: {
        initialZIndex: import("vue").ComputedRef<number>;
        currentZIndex: import("vue").ComputedRef<number>;
        nextZIndex: () => number;
    };
    size: import("vue").ComputedRef<"" | "default" | "small" | "large">;
};
export declare const provideGlobalConfig: (config: MaybeRef<ConfigProviderContext>, app?: App<any> | undefined, global?: boolean) => import("vue").ComputedRef<Partial<import("../config-provider-props").ConfigProviderProps>> | undefined;
