/**
 * Protocol for handling options-related issues.
 */
import { IOptionsErrorContext, NamedValues, OptionsError } from './types';
export interface IOptionsErrorHandler {
    /**
     * This method is normally expected to throw an error, based on "err"
     */
    handle(err: OptionsError, ctx: IOptionsErrorContext): NamedValues;
}
/**
 * Default handler for options-related issues.
 */
export declare class DefaultErrorHandler implements IOptionsErrorHandler {
    handle(err: OptionsError, ctx: IOptionsErrorContext): NamedValues;
}
