declare type Params = Record<string, unknown>;
export default class ValidationError extends Error {
    value: any;
    path?: string;
    type?: string;
    errors: string[];
    params?: Params;
    inner: ValidationError[];
    static formatError(message: string | ((params: Params) => string) | unknown, params: Params): any;
    static isError(err: any): err is ValidationError;
    constructor(errorOrErrors: string | ValidationError | ValidationError[], value?: any, field?: string, type?: string);
}
export {};
