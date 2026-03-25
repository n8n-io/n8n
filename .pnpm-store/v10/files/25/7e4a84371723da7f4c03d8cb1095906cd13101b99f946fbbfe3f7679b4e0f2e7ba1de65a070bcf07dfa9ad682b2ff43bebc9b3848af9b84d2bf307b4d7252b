/**
 * Error thrown by validation. Besides an informative message, it includes the path to the
 * property which triggered the failure.
 */
export declare class VError extends Error {
    path: string;
    constructor(path: string, message: string);
}
/**
 * IContext is used during validation to collect error messages. There is a "noop" fast
 * implementation that does not pay attention to messages, and a full implementation that does.
 */
export interface IContext {
    fail(relPath: string | number | null, message: string | null, score: number): false;
    unionResolver(): IUnionResolver;
    resolveUnion(ur: IUnionResolver): void;
}
/**
 * This helper class is used to collect error messages reported while validating unions.
 */
export interface IUnionResolver {
    createContext(): IContext;
}
/**
 * IErrorDetail describes errors as returned by the validate() and validateStrict() methods.
 */
export interface IErrorDetail {
    path: string;
    message: string;
    nested?: IErrorDetail[];
}
/**
 * Fast implementation of IContext used for first-pass validation. If that fails, we can validate
 * using DetailContext to collect error messages. That's faster for the common case when messages
 * normally pass validation.
 */
export declare class NoopContext implements IContext, IUnionResolver {
    fail(relPath: string | number | null, message: string | null, score: number): false;
    unionResolver(): IUnionResolver;
    createContext(): IContext;
    resolveUnion(ur: IUnionResolver): void;
}
/**
 * Complete implementation of IContext that collects meaningfull errors.
 */
export declare class DetailContext implements IContext {
    private _propNames;
    private _messages;
    private _score;
    fail(relPath: string | number | null, message: string | null, score: number): false;
    unionResolver(): IUnionResolver;
    resolveUnion(unionResolver: IUnionResolver): void;
    getError(path: string): VError;
    getErrorDetail(path: string): IErrorDetail | null;
}
