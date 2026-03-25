import { ValidateError, ValidateOption, RuleValuePackage, InternalRuleItem, SyncErrorType, Value, Values } from './interface';
export declare let warning: (type: string, errors: SyncErrorType[]) => void;
export declare function convertFieldsError(errors: ValidateError[]): Record<string, ValidateError[]>;
export declare function format(template: ((...args: any[]) => string) | string, ...args: any[]): string;
export declare function isEmptyValue(value: Value, type?: string): boolean;
export declare function isEmptyObject(obj: object): boolean;
export declare class AsyncValidationError extends Error {
    errors: ValidateError[];
    fields: Record<string, ValidateError[]>;
    constructor(errors: ValidateError[], fields: Record<string, ValidateError[]>);
}
declare type ValidateFunc = (data: RuleValuePackage, doIt: (errors: ValidateError[]) => void) => void;
export declare function asyncMap(objArr: Record<string, RuleValuePackage[]>, option: ValidateOption, func: ValidateFunc, callback: (errors: ValidateError[]) => void, source: Values): Promise<Values>;
export declare function complementError(rule: InternalRuleItem, source: Values): (oe: ValidateError | (() => string) | string) => ValidateError;
export declare function deepMerge<T extends object>(target: T, source: Partial<T>): T;
export {};
