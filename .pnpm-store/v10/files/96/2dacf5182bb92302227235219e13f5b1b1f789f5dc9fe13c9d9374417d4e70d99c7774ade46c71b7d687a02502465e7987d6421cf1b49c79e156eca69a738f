import type { OpenAPIRef, OpenAPISpec } from '../types';
import { RedocNormalizedOptions } from './RedocNormalizedOptions';
import type { MergedOpenAPISchema } from './types';
/**
 * Loads and keeps spec. Provides raw spec operations
 */
export declare function pushRef(stack: string[], ref?: string): string[];
export declare function concatRefStacks(base: string[], stack?: string[]): string[];
export declare class OpenAPIParser {
    private options;
    specUrl?: string;
    spec: OpenAPISpec;
    private readonly allowMergeRefs;
    constructor(spec: OpenAPISpec, specUrl?: string, options?: RedocNormalizedOptions);
    validate(spec: Record<string, any>): void;
    /**
     * get spec part by JsonPointer ($ref)
     */
    byRef: <T = any>(ref: string) => T | undefined;
    /**
     * checks if the object is OpenAPI reference (contains $ref property)
     */
    isRef<T>(obj: OpenAPIRef | T): obj is OpenAPIRef;
    /**
     * Resolve given reference object or return as is if it is not a reference
     * @param obj object to dereference
     * @param forceCircular whether to dereference even if it is circular ref
     * @param mergeAsAllOf
     */
    deref<T>(obj: OpenAPIRef | T, baseRefsStack?: string[], mergeAsAllOf?: boolean): {
        resolved: T;
        refsStack: string[];
    };
    mergeRefs<T>(ref: OpenAPIRef, resolved: T, mergeAsAllOf: boolean): T;
    /**
     * Merge allOf constraints.
     * @param schema schema with allOF
     * @param $ref pointer of the schema
     * @param forceCircular whether to dereference children even if it is a circular ref
     * @param used$Refs
     */
    mergeAllOf(schema: MergedOpenAPISchema, $ref: string | undefined, refsStack: string[]): MergedOpenAPISchema;
    /**
     * Find all derived definitions among #/components/schemas from any of $refs
     * returns map of definition pointer to definition name
     * @param $refs array of references to find derived from
     */
    findDerived($refs: string[]): Record<string, string[] | string>;
    private hoistOneOfs;
}
