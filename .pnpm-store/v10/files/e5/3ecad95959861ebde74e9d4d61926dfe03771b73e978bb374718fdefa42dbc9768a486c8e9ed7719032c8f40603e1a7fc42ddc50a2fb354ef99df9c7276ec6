import {
    ObservableObjectAdministration,
    deepEnhancer,
    die,
    Annotation,
    MakeResult,
    assert20223DecoratorType,
    ObservableValue,
    asObservableObject,
    $mobx
} from "../internal"

export function createObservableAnnotation(name: string, options?: object): Annotation {
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
    assertObservableDescriptor(adm, this, key, descriptor)
    return adm.defineObservableProperty_(
        key,
        descriptor.value,
        this.options_?.enhancer ?? deepEnhancer,
        proxyTrap
    )
}

function decorate_20223_(
    this: Annotation,
    desc,
    context: ClassAccessorDecoratorContext | ClassFieldDecoratorContext
) {
    if (__DEV__) {
        if (context.kind === "field") {
            throw die(
                `Please use \`@observable accessor ${String(
                    context.name
                )}\` instead of \`@observable ${String(context.name)}\``
            )
        }
        assert20223DecoratorType(context, ["accessor"])
    }

    const ann = this
    const { kind, name } = context

    // The laziness here is not ideal... It's a workaround to how 2022.3 Decorators are implemented:
    //   `addInitializer` callbacks are executed _before_ any accessors are defined (instead of the ideal-for-us right after each).
    //   This means that, if we were to do our stuff in an `addInitializer`, we'd attempt to read a private slot
    //   before it has been initialized. The runtime doesn't like that and throws a `Cannot read private member
    //   from an object whose class did not declare it` error.
    // TODO: it seems that this will not be required anymore in the final version of the spec
    // See TODO: link
    const initializedObjects = new WeakSet()

    function initializeObservable(target, value) {
        const adm: ObservableObjectAdministration = asObservableObject(target)[$mobx]
        const observable = new ObservableValue(
            value,
            ann.options_?.enhancer ?? deepEnhancer,
            __DEV__ ? `${adm.name_}.${name.toString()}` : `ObservableObject.${name.toString()}`,
            false
        )
        adm.values_.set(name, observable)
        initializedObjects.add(target)
    }

    if (kind == "accessor") {
        return {
            get() {
                if (!initializedObjects.has(this)) {
                    initializeObservable(this, desc.get.call(this))
                }
                return this[$mobx].getObservablePropValue_(name)
            },
            set(value) {
                if (!initializedObjects.has(this)) {
                    initializeObservable(this, value)
                }
                return this[$mobx].setObservablePropValue_(name, value)
            },
            init(value) {
                if (!initializedObjects.has(this)) {
                    initializeObservable(this, value)
                }
                return value
            }
        }
    }

    return
}

function assertObservableDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    descriptor: PropertyDescriptor
) {
    if (__DEV__ && !("value" in descriptor)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' cannot be used on getter/setter properties`
        )
    }
}
