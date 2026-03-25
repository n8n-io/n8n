import { Annotation, AnnotationsMap } from "../internal";
import type { Decorator } from "../types/decorator_fills";
export declare const storedAnnotationsSymbol: unique symbol;
/**
 * Creates a function that acts as
 * - decorator
 * - annotation object
 */
export declare function createDecoratorAnnotation<D extends Decorator = Decorator>(annotation: Annotation): PropertyDecorator & Annotation & D;
/**
 * Stores annotation to prototype,
 * so it can be inspected later by `makeObservable` called from constructor
 */
export declare function storeAnnotation(prototype: any, key: PropertyKey, annotation: Annotation): void;
/**
 * Collects annotations from prototypes and stores them on target (instance)
 */
export declare function collectStoredAnnotations(target: any): AnnotationsMap<any, any>;
export declare function is20223Decorator(context: any): context is DecoratorContext;
export declare function assert20223DecoratorType(context: DecoratorContext, types: DecoratorContext["kind"][]): void;
