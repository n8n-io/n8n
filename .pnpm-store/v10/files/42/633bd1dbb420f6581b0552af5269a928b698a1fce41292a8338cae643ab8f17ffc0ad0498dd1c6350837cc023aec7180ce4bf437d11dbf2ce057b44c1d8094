import Reference from './Reference';
import { SchemaLike } from './types';
export interface ConditionBuilder<T extends SchemaLike> {
    (this: T, value: any, schema: T): SchemaLike;
    (v1: any, v2: any, schema: T): SchemaLike;
    (v1: any, v2: any, v3: any, schema: T): SchemaLike;
    (v1: any, v2: any, v3: any, v4: any, schema: T): SchemaLike;
}
export declare type ConditionConfig<T extends SchemaLike> = {
    is: any | ((...values: any[]) => boolean);
    then?: SchemaLike | ((schema: T) => SchemaLike);
    otherwise?: SchemaLike | ((schema: T) => SchemaLike);
};
export declare type ConditionOptions<T extends SchemaLike> = ConditionBuilder<T> | ConditionConfig<T>;
export declare type ResolveOptions<TContext = any> = {
    value?: any;
    parent?: any;
    context?: TContext;
};
declare class Condition<T extends SchemaLike = SchemaLike> {
    refs: Reference[];
    fn: ConditionBuilder<T>;
    constructor(refs: Reference[], options: ConditionOptions<T>);
    resolve(base: T, options: ResolveOptions): any;
}
export default Condition;
