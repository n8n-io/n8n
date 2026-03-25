import validator from 'validator';
import { ValidationOptions } from '../ValidationOptions';
export declare const IS_STRONG_PASSWORD = "isStrongPassword";
/**
 * Options to be passed to IsStrongPassword decorator.
 */
export type IsStrongPasswordOptions = Pick<validator.StrongPasswordOptions, 'minLength' | 'minLowercase' | 'minUppercase' | 'minNumbers' | 'minSymbols'>;
/**
 * Checks if the string is a strong password.
 * If given value is not a string, then it returns false.
 */
export declare function isStrongPassword(value: unknown, options?: IsStrongPasswordOptions): boolean;
/**
 * Checks if the string is a strong password.
 * If given value is not a string, then it returns false.
 */
export declare function IsStrongPassword(options?: IsStrongPasswordOptions, validationOptions?: ValidationOptions): PropertyDecorator;
