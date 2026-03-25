import { isObservableArray, isObservableObject, isObservableMap, untracked } from "mobx"

// Copied from React.PropTypes
function createChainableTypeChecker(validator: React.Validator<any>): React.Requireable<any> {
    function checkType(
        isRequired: boolean,
        props: any,
        propName: string,
        componentName: string,
        location: string,
        propFullName: string,
        ...rest: any[]
    ) {
        return untracked(() => {
            componentName = componentName || "<<anonymous>>"
            propFullName = propFullName || propName
            if (props[propName] == null) {
                if (isRequired) {
                    const actual = props[propName] === null ? "null" : "undefined"
                    return new Error(
                        "The " +
                            location +
                            " `" +
                            propFullName +
                            "` is marked as required " +
                            "in `" +
                            componentName +
                            "`, but its value is `" +
                            actual +
                            "`."
                    )
                }
                return null
            } else {
                // @ts-ignore rest arg is necessary for some React internals - fails tests otherwise
                return validator(props, propName, componentName, location, propFullName, ...rest)
            }
        })
    }

    const chainedCheckType: any = checkType.bind(null, false)
    // Add isRequired to satisfy Requirable
    chainedCheckType.isRequired = checkType.bind(null, true)
    return chainedCheckType
}

// Copied from React.PropTypes
function isSymbol(propType: any, propValue: any): boolean {
    // Native Symbol.
    if (propType === "symbol") {
        return true
    }

    // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
    if (propValue["@@toStringTag"] === "Symbol") {
        return true
    }

    // Fallback for non-spec compliant Symbols which are polyfilled.
    if (typeof Symbol === "function" && propValue instanceof Symbol) {
        return true
    }

    return false
}

// Copied from React.PropTypes
function getPropType(propValue: any): string {
    const propType = typeof propValue
    if (Array.isArray(propValue)) {
        return "array"
    }
    if (propValue instanceof RegExp) {
        // Old webkits (at least until Android 4.0) return 'function' rather than
        // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
        // passes PropTypes.object.
        return "object"
    }
    if (isSymbol(propType, propValue)) {
        return "symbol"
    }
    return propType
}

// This handles more types than `getPropType`. Only used for error messages.
// Copied from React.PropTypes
function getPreciseType(propValue: any): string {
    const propType = getPropType(propValue)
    if (propType === "object") {
        if (propValue instanceof Date) {
            return "date"
        } else if (propValue instanceof RegExp) {
            return "regexp"
        }
    }
    return propType
}

function createObservableTypeCheckerCreator(
    allowNativeType: any,
    mobxType: any
): React.Requireable<any> {
    return createChainableTypeChecker((props, propName, componentName, location, propFullName) => {
        return untracked(() => {
            if (allowNativeType) {
                if (getPropType(props[propName]) === mobxType.toLowerCase()) return null
            }
            let mobxChecker
            switch (mobxType) {
                case "Array":
                    mobxChecker = isObservableArray
                    break
                case "Object":
                    mobxChecker = isObservableObject
                    break
                case "Map":
                    mobxChecker = isObservableMap
                    break
                default:
                    throw new Error(`Unexpected mobxType: ${mobxType}`)
            }
            const propValue = props[propName]
            if (!mobxChecker(propValue)) {
                const preciseType = getPreciseType(propValue)
                const nativeTypeExpectationMessage = allowNativeType
                    ? " or javascript `" + mobxType.toLowerCase() + "`"
                    : ""
                return new Error(
                    "Invalid prop `" +
                        propFullName +
                        "` of type `" +
                        preciseType +
                        "` supplied to" +
                        " `" +
                        componentName +
                        "`, expected `mobx.Observable" +
                        mobxType +
                        "`" +
                        nativeTypeExpectationMessage +
                        "."
                )
            }
            return null
        })
    })
}

function createObservableArrayOfTypeChecker(
    allowNativeType: boolean,
    typeChecker: React.Validator<any>
) {
    return createChainableTypeChecker(
        (props, propName, componentName, location, propFullName, ...rest) => {
            return untracked(() => {
                if (typeof typeChecker !== "function") {
                    return new Error(
                        "Property `" +
                            propFullName +
                            "` of component `" +
                            componentName +
                            "` has " +
                            "invalid PropType notation."
                    )
                } else {
                    let error = createObservableTypeCheckerCreator(allowNativeType, "Array")(
                        props,
                        propName,
                        componentName,
                        location,
                        propFullName
                    )

                    if (error instanceof Error) return error
                    const propValue = props[propName]
                    for (let i = 0; i < propValue.length; i++) {
                        error = (typeChecker as React.Validator<any>)(
                            propValue,
                            i as any,
                            componentName,
                            location,
                            propFullName + "[" + i + "]",
                            ...rest
                        )
                        if (error instanceof Error) return error
                    }

                    return null
                }
            })
        }
    )
}

const observableArray = createObservableTypeCheckerCreator(false, "Array")
const observableArrayOf = createObservableArrayOfTypeChecker.bind(null, false)
const observableMap = createObservableTypeCheckerCreator(false, "Map")
const observableObject = createObservableTypeCheckerCreator(false, "Object")
const arrayOrObservableArray = createObservableTypeCheckerCreator(true, "Array")
const arrayOrObservableArrayOf = createObservableArrayOfTypeChecker.bind(null, true)
const objectOrObservableObject = createObservableTypeCheckerCreator(true, "Object")

export const PropTypes = {
    observableArray,
    observableArrayOf,
    observableMap,
    observableObject,
    arrayOrObservableArray,
    arrayOrObservableArrayOf,
    objectOrObservableObject
}
