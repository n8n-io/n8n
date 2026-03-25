import { VTUVNodeTypeTransformer } from './util';
import { Teleport, KeepAlive, VNodeTypes, ConcreteComponent, Component } from 'vue';
export type CustomCreateStub = (params: {
    name: string;
    component: ConcreteComponent;
    registerStub: (config: {
        source: Component;
        stub: Component;
    }) => void;
}) => ConcreteComponent;
interface StubOptions {
    name: string;
    type?: VNodeTypes | typeof Teleport | typeof KeepAlive;
    renderStubDefaultSlot?: boolean;
}
export declare const createStub: ({ name, type, renderStubDefaultSlot }: StubOptions) => import("vue").DefineComponent<any, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<any>, {} | {
    [x: string]: any;
}, {}>;
export interface CreateStubComponentsTransformerConfig {
    rootComponents: {
        component?: Component;
        functional?: Component;
    };
    stubs?: Record<string, Component | boolean>;
    shallow?: boolean;
    renderStubDefaultSlot: boolean;
}
export declare function createStubComponentsTransformer({ rootComponents, stubs, shallow, renderStubDefaultSlot }: CreateStubComponentsTransformerConfig): VTUVNodeTypeTransformer;
export {};
