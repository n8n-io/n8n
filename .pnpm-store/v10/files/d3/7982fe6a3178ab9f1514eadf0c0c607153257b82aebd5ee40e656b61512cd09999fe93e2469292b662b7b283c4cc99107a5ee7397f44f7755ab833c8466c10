import { GlobalMountOptions, Stub } from './types';
import { VueWrapper } from './vueWrapper';
import { DOMWrapper } from './domWrapper';
import { CustomCreateStub } from './vnodeTransformers/stubComponentsTransformer';
export interface GlobalConfigOptions {
    global: Required<Omit<GlobalMountOptions, 'stubs'>> & {
        stubs: Record<string, Stub>;
    };
    plugins: {
        VueWrapper: Pluggable<VueWrapper>;
        DOMWrapper: Pluggable<DOMWrapper<Node>>;
        createStubs?: CustomCreateStub;
    };
    /**
     * @deprecated use global.
     */
    renderStubDefaultSlot?: boolean;
}
interface Plugin<Instance, O> {
    handler(instance: Instance): Record<string, any>;
    handler(instance: Instance, options: O): Record<string, any>;
    options: O;
}
declare class Pluggable<Instance = DOMWrapper<Node>> {
    installedPlugins: Plugin<Instance, any>[];
    install<O>(handler: (instance: Instance) => Record<string, any>): void;
    install<O>(handler: (instance: Instance, options: O) => Record<string, any>, options: O): void;
    extend(instance: Instance): void;
    /** For testing */
    reset(): void;
}
export declare const config: GlobalConfigOptions;
export {};
