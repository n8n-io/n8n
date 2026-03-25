import type { Oas2Definition } from '@redocly/openapi-core';
import type { Oas3_1Definition, Oas3Definition } from '@redocly/openapi-core/lib/typings/openapi';
export type Definition = Oas3_1Definition | Oas3Definition | Oas2Definition;
export interface ComponentsFiles {
    [schemas: string]: any;
}
export interface RefObject {
    [$ref: string]: string;
}
export declare const COMPONENTS = "components";
export declare const PATHS = "paths";
export declare const WEBHOOKS = "webhooks";
export declare const xWEBHOOKS = "x-webhooks";
export declare enum OPENAPI3_METHOD {
    get = "get",
    put = "put",
    post = "post",
    delete = "delete",
    options = "options",
    head = "head",
    patch = "patch",
    trace = "trace"
}
export declare const OPENAPI3_METHOD_NAMES: OPENAPI3_METHOD[];
export declare enum OPENAPI3_COMPONENT {
    Schemas = "schemas",
    Responses = "responses",
    Parameters = "parameters",
    Examples = "examples",
    Headers = "headers",
    RequestBodies = "requestBodies",
    Links = "links",
    Callbacks = "callbacks",
    SecuritySchemes = "securitySchemes"
}
export declare const OPENAPI3_COMPONENT_NAMES: OPENAPI3_COMPONENT[];
