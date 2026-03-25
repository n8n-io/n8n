import { Annotation } from "../internal";
import type { ClassFieldDecorator, ClassMethodDecorator } from "../types/decorator_fills";
export declare const ACTION = "action";
export declare const ACTION_BOUND = "action.bound";
export declare const AUTOACTION = "autoAction";
export declare const AUTOACTION_BOUND = "autoAction.bound";
export interface IActionFactory extends Annotation, PropertyDecorator, ClassMethodDecorator, ClassFieldDecorator {
    <T extends Function | undefined | null>(fn: T): T;
    <T extends Function | undefined | null>(name: string, fn: T): T;
    (customName: string): PropertyDecorator & Annotation & ClassMethodDecorator & ClassFieldDecorator;
    bound: Annotation & PropertyDecorator & ClassMethodDecorator & ClassFieldDecorator;
}
export declare const action: IActionFactory;
export declare const autoAction: IActionFactory;
export declare function runInAction<T>(fn: () => T): T;
export declare function isAction(thing: any): boolean;
