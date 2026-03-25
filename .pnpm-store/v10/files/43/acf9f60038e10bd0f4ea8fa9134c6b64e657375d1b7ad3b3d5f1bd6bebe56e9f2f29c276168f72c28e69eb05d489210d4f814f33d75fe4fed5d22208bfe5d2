import { IComputedValueOptions, Annotation, IComputedValue } from "../internal";
import type { ClassGetterDecorator } from "../types/decorator_fills";
export declare const COMPUTED = "computed";
export declare const COMPUTED_STRUCT = "computed.struct";
export interface IComputedFactory extends Annotation, PropertyDecorator, ClassGetterDecorator {
    <T>(options: IComputedValueOptions<T>): Annotation & PropertyDecorator & ClassGetterDecorator;
    <T>(func: () => T, options?: IComputedValueOptions<T>): IComputedValue<T>;
    struct: Annotation & PropertyDecorator & ClassGetterDecorator;
}
/**
 * Decorator for class properties: @computed get value() { return expr; }.
 * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
 */
export declare const computed: IComputedFactory;
