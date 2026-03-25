import type { BeanCollection } from '../context/context';
import type { GridOptions } from '../entities/gridOptions';
import type { ValidationModuleName } from '../interfaces/iModule';
import type { RowModelType } from '../interfaces/iRowModel';
export interface OptionsValidator<T extends object> {
    objectName: string;
    allProperties?: string[];
    propertyExceptions?: string[];
    docsUrl?: `${string}/`;
    deprecations: Deprecations<T>;
    validations: Validations<T>;
}
export type Deprecations<T extends object> = Partial<{
    [key in keyof T]: {
        version: string;
        message?: string;
    };
}>;
type GetRequiredModule<T extends object> = (options: T, gridOptions: GridOptions, beans: BeanCollection) => ValidationModuleName | null;
export type RequiredModule<T extends object> = GetRequiredModule<T> | ValidationModuleName;
export type ModuleValidation<T extends object> = {
    [key in keyof T]?: RequiredModule<T>;
};
export type Validations<T extends object> = {
    [key in keyof T]?: OptionsValidation<T>;
};
interface OptionsValidation<T extends object> {
    supportedRowModels?: RowModelType[];
    dependencies?: RequiredOptions<T>;
    validate?: (options: T, gridOptions: GridOptions, beans: BeanCollection) => string | null;
    /** Currently only supports boolean or number */
    expectedType?: 'boolean' | 'number';
}
export type DependentValues<T extends object, K extends keyof T> = {
    required: T[K][];
    reason?: string;
};
export type RequiredOptions<T extends object> = {
    [K in keyof T]: DependentValues<T, K>;
};
export {};
