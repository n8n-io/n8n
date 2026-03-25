import { IEnhancer, IEqualsComparer, IObservableArray, IObservableMapInitialValues, IObservableSetInitialValues, IObservableValue, ObservableMap, ObservableSet, Annotation, AnnotationsMap } from "../internal";
import type { ClassAccessorDecorator, ClassFieldDecorator } from "../types/decorator_fills";
export declare const OBSERVABLE = "observable";
export declare const OBSERVABLE_REF = "observable.ref";
export declare const OBSERVABLE_SHALLOW = "observable.shallow";
export declare const OBSERVABLE_STRUCT = "observable.struct";
export type CreateObservableOptions = {
    name?: string;
    equals?: IEqualsComparer<any>;
    deep?: boolean;
    defaultDecorator?: Annotation;
    proxy?: boolean;
    autoBind?: boolean;
};
export declare const defaultCreateObservableOptions: CreateObservableOptions;
export declare function asCreateObservableOptions(thing: any): CreateObservableOptions;
export declare function getEnhancerFromOptions(options: CreateObservableOptions): IEnhancer<any>;
export declare function getAnnotationFromOptions(options?: CreateObservableOptions): Annotation | undefined;
export declare function getEnhancerFromAnnotation(annotation?: Annotation): IEnhancer<any>;
export interface IObservableValueFactory {
    <T>(value: T, options?: CreateObservableOptions): IObservableValue<T>;
    <T>(value?: T, options?: CreateObservableOptions): IObservableValue<T | undefined>;
}
export interface IObservableFactory extends Annotation, PropertyDecorator, ClassAccessorDecorator, ClassFieldDecorator {
    <T = any>(value: T[], options?: CreateObservableOptions): IObservableArray<T>;
    <T = any>(value: Set<T>, options?: CreateObservableOptions): ObservableSet<T>;
    <K = any, V = any>(value: Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>;
    <T extends object>(value: T, decorators?: AnnotationsMap<T, never>, options?: CreateObservableOptions): T;
    box: IObservableValueFactory;
    array: <T = any>(initialValues?: T[], options?: CreateObservableOptions) => IObservableArray<T>;
    set: <T = any>(initialValues?: IObservableSetInitialValues<T>, options?: CreateObservableOptions) => ObservableSet<T>;
    map: <K = any, V = any>(initialValues?: IObservableMapInitialValues<K, V>, options?: CreateObservableOptions) => ObservableMap<K, V>;
    object: <T = any>(props: T, decorators?: AnnotationsMap<T, never>, options?: CreateObservableOptions) => T;
    /**
     * Decorator that creates an observable that only observes the references, but doesn't try to turn the assigned value into an observable.ts.
     */
    ref: Annotation & PropertyDecorator & ClassAccessorDecorator & ClassFieldDecorator;
    /**
     * Decorator that creates an observable converts its value (objects, maps or arrays) into a shallow observable structure
     */
    shallow: Annotation & PropertyDecorator & ClassAccessorDecorator & ClassFieldDecorator;
    deep: Annotation & PropertyDecorator & ClassAccessorDecorator & ClassFieldDecorator;
    struct: Annotation & PropertyDecorator & ClassAccessorDecorator & ClassFieldDecorator;
}
export declare var observable: IObservableFactory;
