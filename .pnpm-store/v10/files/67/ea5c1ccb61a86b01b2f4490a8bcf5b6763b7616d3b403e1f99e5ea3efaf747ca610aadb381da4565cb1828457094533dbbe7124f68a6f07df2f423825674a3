import { Schema, JsonOptions, JsonConfluentSchema } from './@types';
interface BaseAjvValidationError {
    data?: unknown;
    schema?: unknown;
    message?: string;
}
interface OldAjvValidationError extends BaseAjvValidationError {
    dataPath: string;
    instancePath?: string;
}
interface NewAjvValidationError extends BaseAjvValidationError {
    instancePath: string;
}
type AjvValidationError = OldAjvValidationError | NewAjvValidationError;
export interface ValidateFunction {
    (this: any, data: any): boolean;
    errors?: null | AjvValidationError[];
}
export default class JsonSchema implements Schema {
    private validate;
    private detailedErrorPaths;
    constructor(schema: JsonConfluentSchema, opts?: JsonOptions);
    private getJsonSchema;
    private validatePayload;
    toBuffer(payload: object): Buffer;
    fromBuffer(buffer: Buffer): any;
    isValid(payload: object, opts?: {
        errorHook: (path: Array<string>, value: any, type?: any) => void;
    }): boolean;
    private isOldAjvValidationError;
}
export {};
