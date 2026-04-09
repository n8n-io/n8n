import type { ErrorId, ErrorMap, GetErrorParams } from './errorMessages/errorText';
export declare let baseDocLink: string;
/**
 * The ValidationService passes itself in if it has been included.
 * @param logger
 */
export declare function provideValidationServiceLogger(logger: <TId extends ErrorId>(id: TId, args: GetErrorParams<TId>) => any[]): void;
/** Set by the Framework override to give us accurate links for the framework  */
export declare function setValidationDocLink(docLink: string): void;
/**
 * Correctly formats a string or undefined or null value into a human readable string
 * @param input
 */
export declare function toStringWithNullUndefined(str: string | null | undefined): string;
export declare function getErrorLink(errorNum: ErrorId, args: GetErrorParams<any>): string;
export declare function _warn<TId extends ErrorId, TShowMessageAtCallLocation = ErrorMap[TId]>(...args: GetErrorParams<TId> extends undefined ? [id: TId] : [id: TId, params: GetErrorParams<TId>]): void;
export declare function _error<TId extends ErrorId, TShowMessageAtCallLocation = ErrorMap[TId]>(...args: GetErrorParams<TId> extends undefined ? [id: TId] : [id: TId, params: GetErrorParams<TId>]): void;
/** Used for messages before the ValidationService has been created */
export declare function _logPreInitErr<TId extends ErrorId, TShowMessageAtCallLocation = ErrorMap[TId]>(id: TId, args: GetErrorParams<TId>, defaultMessage: string): void;
export declare function _logPreInitWarn<TId extends ErrorId, TShowMessageAtCallLocation = ErrorMap[TId]>(id: TId, args: GetErrorParams<TId>, defaultMessage: string): void;
export declare function _errMsg<TId extends ErrorId, TShowMessageAtCallLocation = ErrorMap[TId]>(...args: GetErrorParams<TId> extends undefined ? [id: TId] : [id: TId, params: GetErrorParams<TId>]): string;
/** Used for messages before the ValidationService has been created */
export declare function _preInitErrMsg<TId extends ErrorId, TShowMessageAtCallLocation = ErrorMap[TId]>(...args: GetErrorParams<TId> extends undefined ? [id: TId] : [id: TId, params: GetErrorParams<TId>]): string;
