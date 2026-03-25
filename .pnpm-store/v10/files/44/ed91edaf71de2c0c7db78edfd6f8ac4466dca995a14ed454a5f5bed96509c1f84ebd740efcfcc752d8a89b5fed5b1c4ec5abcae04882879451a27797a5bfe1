import {
    die,
    Annotation,
    hasProp,
    createDecoratorAnnotation,
    ObservableObjectAdministration,
    MakeResult
} from "../internal"

import type { ClassMethodDecorator } from "./decorator_fills"

const OVERRIDE = "override"

export const override: Annotation & PropertyDecorator & ClassMethodDecorator =
    createDecoratorAnnotation({
        annotationType_: OVERRIDE,
        make_,
        extend_,
        decorate_20223_
    })

export function isOverride(annotation: Annotation): boolean {
    return annotation.annotationType_ === OVERRIDE
}

function make_(this: Annotation, adm: ObservableObjectAdministration, key): MakeResult {
    // Must not be plain object
    if (__DEV__ && adm.isPlainObject_) {
        die(
            `Cannot apply '${this.annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${this.annotationType_}' cannot be used on plain objects.`
        )
    }
    // Must override something
    if (__DEV__ && !hasProp(adm.appliedAnnotations_!, key)) {
        die(
            `'${adm.name_}.${key.toString()}' is annotated with '${this.annotationType_}', ` +
                `but no such annotated member was found on prototype.`
        )
    }
    return MakeResult.Cancel
}

function extend_(this: Annotation, adm, key, descriptor, proxyTrap): boolean {
    die(`'${this.annotationType_}' can only be used with 'makeObservable'`)
}

function decorate_20223_(this: Annotation, desc, context: DecoratorContext) {
    console.warn(`'${this.annotationType_}' cannot be used with decorators - this is a no-op`)
}
