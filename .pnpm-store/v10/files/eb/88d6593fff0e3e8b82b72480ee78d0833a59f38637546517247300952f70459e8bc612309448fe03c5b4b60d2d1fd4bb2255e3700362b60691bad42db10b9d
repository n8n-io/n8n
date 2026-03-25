import type { AnySchema, AnySchemaObject, UriResolver } from "../types";
import type Ajv from "../ajv";
import type { URIComponents } from "uri-js-replace";
export type LocalRefs = {
    [Ref in string]?: AnySchemaObject;
};
export declare function inlineRef(schema: AnySchema, limit?: boolean | number): boolean;
export declare function getFullPath(resolver: UriResolver, id?: string, normalize?: boolean): string;
export declare function _getFullPath(resolver: UriResolver, p: URIComponents): string;
export declare function normalizeId(id: string | undefined): string;
export declare function resolveUrl(resolver: UriResolver, baseId: string, id: string): string;
export declare function getSchemaRefs(this: Ajv, schema: AnySchema, baseId: string): LocalRefs;
