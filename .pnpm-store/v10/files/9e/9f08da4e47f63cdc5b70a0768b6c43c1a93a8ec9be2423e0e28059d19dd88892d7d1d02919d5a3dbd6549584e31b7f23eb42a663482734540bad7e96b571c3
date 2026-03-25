import {
    ObservableObjectAdministration,
    die,
    Annotation,
    MakeResult,
    assert20223DecoratorType,
    $mobx,
    asObservableObject,
    ComputedValue
} from "../internal"

export function createComputedAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_,
        decorate_20223_
    }
}

function make_(
    this: Annotation,
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor
): MakeResult {
    return this.extend_(adm, key, descriptor, false) === null ? MakeResult.Cancel : MakeResult.Break
}

function extend_(
    this: Annotation,
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean | null {
    assertComputedDescriptor(adm, this, key, descriptor)
    return adm.defineComputedProperty_(
        key,
        {
            ...this.options_,
            get: descriptor.get,
            set: descriptor.set
        },
        proxyTrap
    )
}

function decorate_20223_(this: Annotation, get, context: ClassGetterDecoratorContext) {
    if (__DEV__) {
        assert20223DecoratorType(context, ["getter"])
    }
    const ann = this
    const { name: key, addInitializer } = context

    addInitializer(function () {
        const adm: ObservableObjectAdministration = asObservableObject(this)[$mobx]
        const options = {
            ...ann.options_,
            get,
            context: this
        }
        options.name ||= __DEV__
            ? `${adm.name_}.${key.toString()}`
            : `ObservableObject.${key.toString()}`
        adm.values_.set(key, new ComputedValue(options))
    })

    return function () {
        return this[$mobx].getObservablePropValue_(key)
    }
}

function assertComputedDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    { get }: PropertyDescriptor
) {
    if (__DEV__ && !get) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' can only be used on getter(+setter) properties.`
        )
    }
}
