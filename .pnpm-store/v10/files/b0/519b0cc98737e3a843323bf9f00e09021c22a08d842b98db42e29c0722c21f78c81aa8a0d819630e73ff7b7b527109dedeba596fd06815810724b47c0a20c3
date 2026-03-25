import { Annotation, addHiddenProp, AnnotationsMap, hasProp, die, isOverride } from "../internal"

import type { Decorator } from "../types/decorator_fills"

export const storedAnnotationsSymbol = Symbol("mobx-stored-annotations")

/**
 * Creates a function that acts as
 * - decorator
 * - annotation object
 */
export function createDecoratorAnnotation<D extends Decorator = Decorator>(
    annotation: Annotation
): PropertyDecorator & Annotation & D {
    function decorator(target, property) {
        if (is20223Decorator(property)) {
            return annotation.decorate_20223_(target, property)
        } else {
            storeAnnotation(target, property, annotation)
        }
    }
    return Object.assign(decorator, annotation) as any
}

/**
 * Stores annotation to prototype,
 * so it can be inspected later by `makeObservable` called from constructor
 */
export function storeAnnotation(prototype: any, key: PropertyKey, annotation: Annotation) {
    if (!hasProp(prototype, storedAnnotationsSymbol)) {
        addHiddenProp(prototype, storedAnnotationsSymbol, {
            // Inherit annotations
            ...prototype[storedAnnotationsSymbol]
        })
    }
    // @override must override something
    if (__DEV__ && isOverride(annotation) && !hasProp(prototype[storedAnnotationsSymbol], key)) {
        const fieldName = `${prototype.constructor.name}.prototype.${key.toString()}`
        die(
            `'${fieldName}' is decorated with 'override', ` +
                `but no such decorated member was found on prototype.`
        )
    }
    // Cannot re-decorate
    assertNotDecorated(prototype, annotation, key)

    // Ignore override
    if (!isOverride(annotation)) {
        prototype[storedAnnotationsSymbol][key] = annotation
    }
}

function assertNotDecorated(prototype: object, annotation: Annotation, key: PropertyKey) {
    if (__DEV__ && !isOverride(annotation) && hasProp(prototype[storedAnnotationsSymbol], key)) {
        const fieldName = `${prototype.constructor.name}.prototype.${key.toString()}`
        const currentAnnotationType = prototype[storedAnnotationsSymbol][key].annotationType_
        const requestedAnnotationType = annotation.annotationType_
        die(
            `Cannot apply '@${requestedAnnotationType}' to '${fieldName}':` +
                `\nThe field is already decorated with '@${currentAnnotationType}'.` +
                `\nRe-decorating fields is not allowed.` +
                `\nUse '@override' decorator for methods overridden by subclass.`
        )
    }
}

/**
 * Collects annotations from prototypes and stores them on target (instance)
 */
export function collectStoredAnnotations(target): AnnotationsMap<any, any> {
    if (!hasProp(target, storedAnnotationsSymbol)) {
        // if (__DEV__ && !target[storedAnnotationsSymbol]) {
        //     die(
        //         `No annotations were passed to makeObservable, but no decorated members have been found either`
        //     )
        // }
        // We need a copy as we will remove annotation from the list once it's applied.
        addHiddenProp(target, storedAnnotationsSymbol, { ...target[storedAnnotationsSymbol] })
    }
    return target[storedAnnotationsSymbol]
}

export function is20223Decorator(context): context is DecoratorContext {
    return typeof context == "object" && typeof context["kind"] == "string"
}

export function assert20223DecoratorType(
    context: DecoratorContext,
    types: DecoratorContext["kind"][]
) {
    if (__DEV__ && !types.includes(context.kind)) {
        die(
            `The decorator applied to '${String(context.name)}' cannot be used on a ${
                context.kind
            } element`
        )
    }
}
