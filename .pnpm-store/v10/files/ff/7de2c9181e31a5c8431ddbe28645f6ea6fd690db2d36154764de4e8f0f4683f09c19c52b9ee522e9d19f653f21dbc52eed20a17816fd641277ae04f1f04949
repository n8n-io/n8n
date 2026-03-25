import { Component, ConcreteComponent, transformVNodeArgs } from 'vue';
type VNodeArgsTransformerFn = NonNullable<Parameters<typeof transformVNodeArgs>[0]>;
type TransformVNodeArgs = Parameters<VNodeArgsTransformerFn>;
type VNodeTransformerArgsType = TransformVNodeArgs[0];
type InstanceArgsType = TransformVNodeArgs[1];
type VNodeTransformerInputType = VNodeTransformerArgsType[0];
type ExtractComponentTypes<T> = T extends ConcreteComponent ? T : never;
type VNodeTransformerInputComponentType = ExtractComponentTypes<VNodeTransformerInputType>;
export type VTUVNodeTypeTransformer = (inputType: VNodeTransformerInputComponentType, instance: InstanceArgsType) => VNodeTransformerInputComponentType;
export declare const isTeleport: (type: any) => boolean;
export declare const isKeepAlive: (type: any) => boolean;
export interface RootComponents {
    component?: Component;
    functional?: Component;
}
export declare const isRootComponent: (rootComponents: RootComponents, type: VNodeTransformerInputComponentType, instance: InstanceArgsType) => boolean;
export declare const createVNodeTransformer: ({ rootComponents, transformers }: {
    rootComponents: RootComponents;
    transformers: VTUVNodeTypeTransformer[];
}) => VNodeArgsTransformerFn;
export {};
