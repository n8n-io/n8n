import { ValidationOptions } from '../ValidationOptions';
export declare const ARRAY_UNIQUE = "arrayUnique";
export type ArrayUniqueIdentifier<T = any> = (o: T) => any;
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
export declare function arrayUnique(array: unknown[], identifier?: ArrayUniqueIdentifier): boolean;
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
export declare function ArrayUnique<T = any>(identifierOrOptions?: ArrayUniqueIdentifier<T> | ValidationOptions, validationOptions?: ValidationOptions): PropertyDecorator;
