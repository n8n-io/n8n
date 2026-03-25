import {
    ObservableObjectAdministration,
    createAction,
    isAction,
    defineProperty,
    die,
    isFunction,
    Annotation,
    globalState,
    MakeResult,
    assert20223DecoratorType,
    storeAnnotation
} from "../internal"

export function createActionAnnotation(name: string, options?: object): Annotation {
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
    // bound
    if (this.options_?.bound) {
        return this.extend_(adm, key, descriptor, false) === null
            ? MakeResult.Cancel
            : MakeResult.Break
    }
    // own
    if (source === adm.target_) {
        return this.extend_(adm, key, descriptor, false) === null
            ? MakeResult.Cancel
            : MakeResult.Continue
    }
    // prototype
    if (isAction(descriptor.value)) {
        // A prototype could have been annotated already by other constructor,
        // rest of the proto chain must be annotated already
        return MakeResult.Break
    }
    const actionDescriptor = createActionDescriptor(adm, this, key, descriptor, false)
    defineProperty(source, key, actionDescriptor)
    return MakeResult.Continue
}

function extend_(
    this: Annotation,
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean | null {
    const actionDescriptor = createActionDescriptor(adm, this, key, descriptor)
    return adm.defineProperty_(key, actionDescriptor, proxyTrap)
}

function decorate_20223_(this: Annotation, mthd, context: DecoratorContext) {
    if (__DEV__) {
        assert20223DecoratorType(context, ["method", "field"])
    }
    const { kind, name, addInitializer } = context
    const ann = this

    const _createAction = m =>
        createAction(ann.options_?.name ?? name!.toString(), m, ann.options_?.autoAction ?? false)

    // Backwards/Legacy behavior, expects makeObservable(this)
    if (kind == "field") {
        addInitializer(function () {
            storeAnnotation(this, name, ann)
        })
        return
    }

    if (kind == "method") {
        if (!isAction(mthd)) {
            mthd = _createAction(mthd)
        }

        if (this.options_?.bound) {
            addInitializer(function () {
                const self = this as any
                const bound = self[name].bind(self)
                bound.isMobxAction = true
                self[name] = bound
            })
        }

        return mthd
    }

    die(
        `Cannot apply '${ann.annotationType_}' to '${String(name)}' (kind: ${kind}):` +
            `\n'${ann.annotationType_}' can only be used on properties with a function value.`
    )
}

function assertActionDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    { value }: PropertyDescriptor
) {
    if (__DEV__ && !isFunction(value)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' can only be used on properties with a function value.`
        )
    }
}

export function createActionDescriptor(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    // provides ability to disable safeDescriptors for prototypes
    safeDescriptors: boolean = globalState.safeDescriptors
) {
    assertActionDescriptor(adm, annotation, key, descriptor)
    let { value } = descriptor
    if (annotation.options_?.bound) {
        value = value.bind(adm.proxy_ ?? adm.target_)
    }
    return {
        value: createAction(
            annotation.options_?.name ?? key.toString(),
            value,
            annotation.options_?.autoAction ?? false,
            // https://github.com/mobxjs/mobx/discussions/3140
            annotation.options_?.bound ? adm.proxy_ ?? adm.target_ : undefined
        ),
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
