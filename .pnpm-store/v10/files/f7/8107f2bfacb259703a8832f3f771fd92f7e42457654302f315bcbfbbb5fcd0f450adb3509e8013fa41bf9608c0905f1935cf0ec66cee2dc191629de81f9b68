import type { Directive, UnwrapRef } from 'vue';
import type { LoadingOptions } from './types';
import type { LoadingInstance } from './loading';
declare const INSTANCE_KEY: unique symbol;
export declare type LoadingBinding = boolean | UnwrapRef<LoadingOptions>;
export interface ElementLoading extends HTMLElement {
    [INSTANCE_KEY]?: {
        instance: LoadingInstance;
        options: LoadingOptions;
    };
}
export declare const vLoading: Directive<ElementLoading, LoadingBinding>;
export {};
