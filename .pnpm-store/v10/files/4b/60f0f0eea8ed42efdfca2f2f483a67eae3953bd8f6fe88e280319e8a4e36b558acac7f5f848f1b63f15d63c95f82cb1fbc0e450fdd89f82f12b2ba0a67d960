import type { Request } from 'express';
import { Attributes } from '@opentelemetry/api';
/**
 * This symbol is used to mark express layer as being already instrumented
 * since its possible to use a given layer multiple times (ex: middlewares)
 */
export declare const kLayerPatched: unique symbol;
/**
 * This const define where on the `request` object the Instrumentation will mount the
 * current stack of express layer.
 *
 * It is necessary because express doesn't store the different layers
 * (ie: middleware, router etc) that it called to get to the current layer.
 * Given that, the only way to know the route of a given layer is to
 * store the path of where each previous layer has been mounted.
 *
 * ex: bodyParser > auth middleware > /users router > get /:id
 *  in this case the stack would be: ["/users", "/:id"]
 *
 * ex2: bodyParser > /api router > /v1 router > /users router > get /:id
 *  stack: ["/api", "/v1", "/users", ":id"]
 *
 */
export declare const _LAYERS_STORE_PROPERTY = "__ot_middlewares";
export type PatchedRequest = {
    [_LAYERS_STORE_PROPERTY]?: string[];
} & Request;
export type PathParams = string | RegExp | Array<string | RegExp>;
export type ExpressRouter = {
    params: {
        [key: string]: string;
    };
    _params: string[];
    caseSensitive: boolean;
    mergeParams: boolean;
    strict: boolean;
    stack: ExpressLayer[];
};
export type ExpressLayer = {
    handle: Function & Record<string, any>;
    [kLayerPatched]?: boolean;
    name: string;
    params: {
        [key: string]: string;
    };
    path: string;
    regexp: RegExp;
    route?: ExpressLayer;
};
export type LayerMetadata = {
    attributes: Attributes;
    name: string;
};
//# sourceMappingURL=internal-types.d.ts.map