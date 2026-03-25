const niceErrors = {
    0: `Invalid value for configuration 'enforceActions', expected 'never', 'always' or 'observed'`,
    1(annotationType, key: PropertyKey) {
        return `Cannot apply '${annotationType}' to '${key.toString()}': Field not found.`
    },
    /*
    2(prop) {
        return `invalid decorator for '${prop.toString()}'`
    },
    3(prop) {
        return `Cannot decorate '${prop.toString()}': action can only be used on properties with a function value.`
    },
    4(prop) {
        return `Cannot decorate '${prop.toString()}': computed can only be used on getter properties.`
    },
    */
    5: "'keys()' can only be used on observable objects, arrays, sets and maps",
    6: "'values()' can only be used on observable objects, arrays, sets and maps",
    7: "'entries()' can only be used on observable objects, arrays and maps",
    8: "'set()' can only be used on observable objects, arrays and maps",
    9: "'remove()' can only be used on observable objects, arrays and maps",
    10: "'has()' can only be used on observable objects, arrays and maps",
    11: "'get()' can only be used on observable objects, arrays and maps",
    12: `Invalid annotation`,
    13: `Dynamic observable objects cannot be frozen. If you're passing observables to 3rd party component/function that calls Object.freeze, pass copy instead: toJS(observable)`,
    14: "Intercept handlers should return nothing or a change object",
    15: `Observable arrays cannot be frozen. If you're passing observables to 3rd party component/function that calls Object.freeze, pass copy instead: toJS(observable)`,
    16: `Modification exception: the internal structure of an observable array was changed.`,
    17(index, length) {
        return `[mobx.array] Index out of bounds, ${index} is larger than ${length}`
    },
    18: "mobx.map requires Map polyfill for the current browser. Check babel-polyfill or core-js/es6/map.js",
    19(other) {
        return "Cannot initialize from classes that inherit from Map: " + other.constructor.name
    },
    20(other) {
        return "Cannot initialize map from " + other
    },
    21(dataStructure) {
        return `Cannot convert to map from '${dataStructure}'`
    },
    22: "mobx.set requires Set polyfill for the current browser. Check babel-polyfill or core-js/es6/set.js",
    23: "It is not possible to get index atoms from arrays",
    24(thing) {
        return "Cannot obtain administration from " + thing
    },
    25(property, name) {
        return `the entry '${property}' does not exist in the observable map '${name}'`
    },
    26: "please specify a property",
    27(property, name) {
        return `no observable property '${property.toString()}' found on the observable object '${name}'`
    },
    28(thing) {
        return "Cannot obtain atom from " + thing
    },
    29: "Expecting some object",
    30: "invalid action stack. did you forget to finish an action?",
    31: "missing option for computed: get",
    32(name, derivation) {
        return `Cycle detected in computation ${name}: ${derivation}`
    },
    33(name) {
        return `The setter of computed value '${name}' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?`
    },
    34(name) {
        return `[ComputedValue '${name}'] It is not possible to assign a new value to a computed value.`
    },
    35: "There are multiple, different versions of MobX active. Make sure MobX is loaded only once or use `configure({ isolateGlobalState: true })`",
    36: "isolateGlobalState should be called before MobX is running any reactions",
    37(method) {
        return `[mobx] \`observableArray.${method}()\` mutates the array in-place, which is not allowed inside a derivation. Use \`array.slice().${method}()\` instead`
    },
    38: "'ownKeys()' can only be used on observable objects",
    39: "'defineProperty()' can only be used on observable objects"
} as const

const errors: typeof niceErrors = __DEV__ ? niceErrors : ({} as any)

export function die(error: string | keyof typeof errors, ...args: any[]): never {
    if (__DEV__) {
        let e: any = typeof error === "string" ? error : errors[error]
        if (typeof e === "function") e = e.apply(null, args as any)
        throw new Error(`[MobX] ${e}`)
    }
    throw new Error(
        typeof error === "number"
            ? `[MobX] minified error nr: ${error}${
                  args.length ? " " + args.map(String).join(",") : ""
              }. Find the full error at: https://github.com/mobxjs/mobx/blob/main/packages/mobx/src/errors.ts`
            : `[MobX] ${error}`
    )
}
