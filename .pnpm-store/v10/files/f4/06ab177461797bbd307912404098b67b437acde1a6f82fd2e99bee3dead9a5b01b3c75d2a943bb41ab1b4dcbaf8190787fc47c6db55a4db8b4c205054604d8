import { ComponentPublicInstance, App } from 'vue';
import type { DOMWrapper as DOMWrapperType } from './domWrapper';
import type { VueWrapper as VueWrapperType } from './vueWrapper';
export declare enum WrapperType {
    DOMWrapper = 0,
    VueWrapper = 1
}
type DOMWrapperFactory = <T extends Node>(element: T | null | undefined) => DOMWrapperType<T>;
type VueWrapperFactory = <T extends ComponentPublicInstance>(app: App | null, vm: T, setProps?: (props: Record<string, unknown>) => Promise<void>) => VueWrapperType<T>;
export declare function registerFactory(type: WrapperType.DOMWrapper, fn: DOMWrapperFactory): void;
export declare function registerFactory(type: WrapperType.VueWrapper, fn: VueWrapperFactory): void;
export declare const createDOMWrapper: DOMWrapperFactory;
export declare const createVueWrapper: VueWrapperFactory;
export {};
