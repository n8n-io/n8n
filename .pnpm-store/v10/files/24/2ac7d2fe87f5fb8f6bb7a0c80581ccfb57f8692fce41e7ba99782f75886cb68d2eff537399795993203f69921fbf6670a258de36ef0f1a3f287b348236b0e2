import {
    createAction,
    executeAction,
    Annotation,
    storeAnnotation,
    die,
    isFunction,
    isStringish,
    createDecoratorAnnotation,
    createActionAnnotation,
    is20223Decorator
} from "../internal"

import type { ClassFieldDecorator, ClassMethodDecorator } from "../types/decorator_fills"

export const ACTION = "action"
export const ACTION_BOUND = "action.bound"
export const AUTOACTION = "autoAction"
export const AUTOACTION_BOUND = "autoAction.bound"

const DEFAULT_ACTION_NAME = "<unnamed action>"

const actionAnnotation = createActionAnnotation(ACTION)
const actionBoundAnnotation = createActionAnnotation(ACTION_BOUND, {
    bound: true
})
const autoActionAnnotation = createActionAnnotation(AUTOACTION, {
    autoAction: true
})
const autoActionBoundAnnotation = createActionAnnotation(AUTOACTION_BOUND, {
    autoAction: true,
    bound: true
})

export interface IActionFactory
    extends Annotation,
        PropertyDecorator,
        ClassMethodDecorator,
        ClassFieldDecorator {
    // nameless actions
    <T extends Function | undefined | null>(fn: T): T
    // named actions
    <T extends Function | undefined | null>(name: string, fn: T): T

    // named decorator
    (customName: string): PropertyDecorator &
        Annotation &
        ClassMethodDecorator &
        ClassFieldDecorator

    // decorator (name no longer supported)
    bound: Annotation & PropertyDecorator & ClassMethodDecorator & ClassFieldDecorator
}

function createActionFactory(autoAction: boolean): IActionFactory {
    const res: IActionFactory = function action(arg1, arg2?): any {
        // action(fn() {})
        if (isFunction(arg1)) {
            return createAction(arg1.name || DEFAULT_ACTION_NAME, arg1, autoAction)
        }
        // action("name", fn() {})
        if (isFunction(arg2)) {
            return createAction(arg1, arg2, autoAction)
        }
        // @action (2022.3 Decorators)
        if (is20223Decorator(arg2)) {
            return (autoAction ? autoActionAnnotation : actionAnnotation).decorate_20223_(
                arg1,
                arg2
            )
        }
        // @action
        if (isStringish(arg2)) {
            return storeAnnotation(arg1, arg2, autoAction ? autoActionAnnotation : actionAnnotation)
        }
        // action("name") & @action("name")
        if (isStringish(arg1)) {
            return createDecoratorAnnotation(
                createActionAnnotation(autoAction ? AUTOACTION : ACTION, {
                    name: arg1,
                    autoAction
                })
            )
        }

        if (__DEV__) {
            die("Invalid arguments for `action`")
        }
    } as IActionFactory
    return res
}

export const action: IActionFactory = createActionFactory(false)
Object.assign(action, actionAnnotation)
export const autoAction: IActionFactory = createActionFactory(true)
Object.assign(autoAction, autoActionAnnotation)

action.bound = createDecoratorAnnotation(actionBoundAnnotation)
autoAction.bound = createDecoratorAnnotation(autoActionBoundAnnotation)

export function runInAction<T>(fn: () => T): T {
    return executeAction(fn.name || DEFAULT_ACTION_NAME, false, fn, this, undefined)
}

export function isAction(thing: any) {
    return isFunction(thing) && thing.isMobxAction === true
}
