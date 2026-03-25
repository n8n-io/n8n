import { ObservableObjectAdministration, isFunction } from "../internal"

export const enum MakeResult {
    Cancel,
    Break,
    Continue
}

export type Annotation = {
    annotationType_: string
    make_(
        adm: ObservableObjectAdministration,
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        source: object
    ): MakeResult
    extend_(
        adm: ObservableObjectAdministration,
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        proxyTrap: boolean
    ): boolean | null
    decorate_20223_(value: any, context: DecoratorContext)
    options_?: any
}

export type AnnotationMapEntry =
    | Annotation
    | true /* follow the default decorator, usually deep */
    | false /* don't decorate this property */

// AdditionalFields can be used to declare additional keys that can be used, for example to be able to
// declare annotations for private/ protected members, see #2339
export type AnnotationsMap<T, AdditionalFields extends PropertyKey> = {
    [P in Exclude<keyof T, "toString">]?: AnnotationMapEntry
} & Record<AdditionalFields, AnnotationMapEntry>

export function isAnnotation(thing: any) {
    return (
        // Can be function
        thing instanceof Object &&
        typeof thing.annotationType_ === "string" &&
        isFunction(thing.make_) &&
        isFunction(thing.extend_)
    )
}

export function isAnnotationMapEntry(thing: any) {
    return typeof thing === "boolean" || isAnnotation(thing)
}
