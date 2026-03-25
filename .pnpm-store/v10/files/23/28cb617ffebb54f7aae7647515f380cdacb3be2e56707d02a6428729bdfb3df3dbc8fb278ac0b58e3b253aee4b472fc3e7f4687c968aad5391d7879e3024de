import type { ErrorObject } from 'ajv-draft-04';
import { Request } from 'express';
import { AjvInstance, ValidationError } from '../framework/types';
export declare class ContentType {
    readonly mediaType: string;
    readonly isWildCard: boolean;
    readonly parameters: {
        charset?: string;
        boundary?: string;
    } & Record<string, string>;
    private constructor();
    static from(req: Request): ContentType;
    static fromString(type: string): ContentType;
    equivalents(): ContentType[];
    normalize(excludeParams?: string[]): string;
}
/**
 * (side-effecting) modifies the errors object
 * TODO - do this some other way
 * @param errors
 */
export declare function augmentAjvErrors(errors?: ErrorObject[]): ErrorObject[];
export declare function ajvErrorsToValidatorError(status: number, errors: ErrorObject[]): ValidationError;
export declare const deprecationWarning: (message?: any, ...optionalParams: any[]) => void;
/**
 *
 * @param accepts the list of accepted media types
 * @param expectedTypes - expected media types defined in the response schema
 * @returns the content-type
 */
export declare const findResponseContent: (accepts: string[], expectedTypes: string[]) => string;
export declare const zipObject: (keys: any, values: any) => any;
/**
 * Tries to fetch a schema from ajv instance by the provided key otherwise adds (and
 * compiles) the schema under provided key. We provide a key to avoid ajv library
 * using the whole schema as a cache key, leading to a lot of unnecessary memory
 * usage - this is not recommended by the library either:
 * https://ajv.js.org/guide/managing-schemas.html#cache-key-schema-vs-key-vs-id
 *
 * @param ajvCacheKey - Key which will be used for ajv cache
 */
export declare function useAjvCache(ajv: AjvInstance, schema: object, ajvCacheKey: string): import("ajv/dist/types").AnyValidateFunction<unknown>;
