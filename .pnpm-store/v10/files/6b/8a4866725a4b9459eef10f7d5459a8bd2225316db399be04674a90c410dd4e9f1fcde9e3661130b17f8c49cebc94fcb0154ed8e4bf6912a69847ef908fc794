import {
    ObservableObjectAdministration,
    Annotation,
    defineProperty,
    die,
    flow,
    isFlow,
    isFunction,
    globalState,
    MakeResult,
    hasProp,
    assert20223DecoratorType
} from "../internal"

export function createFlowAnnotation(name: string, options?: object): Annotation {
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
    descriptor: PropertyDescriptor,
    source: object
): MakeResult {
    // own
    if (source === adm.target_) {
        return this.extend_(adm, key, descriptor, false) === null
            ? MakeResult.Cancel
            : MakeResult.Continue
    }
    // prototype
    // bound - must annotate protos to support super.flow()
    if (this.options_?.bound && (!hasProp(adm.target_, key) || !isFlow(adm.target_[key]))) {
        if (this.extend_(adm, key, descriptor, false) === null) {
            return MakeResult.Cancel
        }
    }
    if (isFlow(descriptor.value)) {
        // A prototype could have been annotated already by other constructor,
        // rest of the proto chain must be annotated already
        return MakeResult.Break
    }
    const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor, false, false)
    defineProperty(source, key, flowDescriptor)
    return MakeResult.Continue
}

function extend_(
    this: Annotation,
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean | null {
    const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor, this.options_?.bound)
    return adm.defineProperty_(key, flowDescriptor, proxyTrap)
}

function decorate_20223_(this: Annotation, mthd, context: ClassMethodDecoratorContext) {
    if (__DEV__) {
        assert20223DecoratorType(context, ["method"])
    }
    const { name, addInitializer } = context

    if (!isFlow(mthd)) {
        mthd = flow(mthd)
    }

    if (this.options_?.bound) {
        addInitializer(function () {
            const self = this as any
            const bound = self[name].bind(self)
            bound.isMobXFlow = true
            self[name] = bound
        })
    }

    return mthd
}

function assertFlowDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    { value }: PropertyDescriptor
) {
    if (__DEV__ && !isFunction(value)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' can only be used on properties with a generator function value.`
        )
    }
}

function createFlowDescriptor(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    bound: boolean,
    // provides ability to disable safeDescriptors for prototypes
    safeDescriptors: boolean = globalState.safeDescriptors
): PropertyDescriptor {
    assertFlowDescriptor(adm, annotation, key, descriptor)
    let { value } = descriptor
    // In case of flow.bound, the descriptor can be from already annotated prototype
    if (!isFlow(value)) {
        value = flow(value)
    }
    if (bound) {
        // We do not keep original function around, so we bind the existing flow
        value = value.bind(adm.proxy_ ?? adm.target_)
        // This is normally set by `flow`, but `bind` returns new function...
        value.isMobXFlow = true
    }
    return {
        value,
        // Non-configurable for classes
        // prevents accidental field redefinition in subclass
        configurable: safeDescriptors ? adm.isPlainObject_ : true,
        // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
        enumerable: false,
        // Non-obsevable, therefore non-writable
        // Also prevents rewriting in subclass constructor
        writable: safeDescriptors ? false : true
    }
}
