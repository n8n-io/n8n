import { ComponentPublicInstance, DefineComponent, VNode } from 'vue';
import type { ComponentExposed, ComponentProps, ComponentSlots } from 'vue-component-type-helpers';
import { MountingOptions } from './types';
import { VueWrapper } from './vueWrapper';
type ShimSlotReturnType<T> = T extends (...args: infer P) => any ? (...args: P) => any : never;
type WithArray<T> = T | T[];
type ComponentData<T> = T extends {
    data?(...args: any): infer D;
} ? D : {};
export type ComponentMountingOptions<T, P extends ComponentProps<T> = ComponentProps<T>> = Omit<MountingOptions<P, ComponentData<T>>, 'slots'> & {
    slots?: {
        [K in keyof ComponentSlots<T>]: WithArray<ShimSlotReturnType<ComponentSlots<T>[K]> | string | VNode | (new () => any) | {
            template: string;
        }>;
    };
} & Record<string, unknown>;
export declare function mount<T, C = T extends ((...args: any) => any) | (new (...args: any) => any) ? T : T extends {
    props?: infer Props;
} ? DefineComponent<Props extends Readonly<(infer PropNames)[]> | (infer PropNames)[] ? {
    [key in PropNames extends string ? PropNames : string]?: any;
} : Props> : DefineComponent, P extends ComponentProps<C> = ComponentProps<C>>(originalComponent: T, options?: ComponentMountingOptions<C, P>): VueWrapper<ComponentProps<C> & ComponentData<C> & ComponentExposed<C>, ComponentPublicInstance<ComponentProps<C>, ComponentData<C> & ComponentExposed<C> & Omit<P, keyof ComponentProps<C>>>>;
export declare const shallowMount: typeof mount;
export {};
