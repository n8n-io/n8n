import { DefineComponent } from 'vue';
import { ComponentMountingOptions } from './mount';
import { RenderMountingOptions } from './types';
export declare function renderToString<T, C = T extends ((...args: any) => any) | (new (...args: any) => any) ? T : T extends {
    props?: infer Props;
} ? DefineComponent<Props extends Readonly<(infer PropNames)[]> | (infer PropNames)[] ? {
    [key in PropNames extends string ? PropNames : string]?: any;
} : Props> : DefineComponent>(originalComponent: T, options?: ComponentMountingOptions<C> & Pick<RenderMountingOptions<any>, 'attachTo'>): Promise<string>;
