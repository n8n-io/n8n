import { GlobalMountOptions, RefSelector, Stub, Stubs } from './types';
import { Component, ComponentOptions, ComponentPublicInstance, ConcreteComponent, Directive, FunctionalComponent } from 'vue';
export declare function mergeGlobalProperties(mountGlobal?: GlobalMountOptions): Required<GlobalMountOptions>;
export declare const isObject: (obj: unknown) => obj is Record<string, any>;
export declare const mergeDeep: (target: Record<string, unknown>, source: Record<string, unknown>) => Record<string, unknown>;
export declare function isClassComponent(component: unknown): boolean;
export declare function isComponent(component: unknown): component is ConcreteComponent;
export declare function isFunctionalComponent(component: unknown): component is FunctionalComponent;
export declare function isObjectComponent(component: unknown): component is ComponentOptions;
export declare function textContent(element: Node): string;
export declare function hasOwnProperty<O extends {}, P extends PropertyKey>(obj: O, prop: P): obj is O & Record<P, unknown>;
export declare function isNotNullOrUndefined<T extends {}>(obj: T | null | undefined): obj is T;
export declare function isRefSelector(selector: string | RefSelector): selector is RefSelector;
export declare function convertStubsToRecord(stubs: Stubs): Record<string, Stub>;
export declare function getComponentsFromStubs(stubs: Stubs): Record<string, Component | boolean>;
export declare function getDirectivesFromStubs(stubs: Stubs): Record<string, Directive | true>;
export declare function hasSetupState(vm: ComponentPublicInstance): vm is ComponentPublicInstance & {
    $: {
        setupState: Record<string, unknown>;
    };
};
export declare function isScriptSetup(vm: ComponentPublicInstance): vm is ComponentPublicInstance & {
    $: {
        setupState: Record<string, unknown>;
    };
};
export declare const getGlobalThis: () => any;
