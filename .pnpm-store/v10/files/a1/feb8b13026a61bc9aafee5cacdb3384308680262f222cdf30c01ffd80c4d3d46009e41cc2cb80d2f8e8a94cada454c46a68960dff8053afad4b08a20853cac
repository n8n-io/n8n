import { Manifest, ManifestOptions, GlobalConfigs, ResourceTypeConstraint } from './manifest';
import { Response } from './response';
import { RequestContext } from './request';
import { Gateway } from './gateway/index';
import type { Params } from './types';
export type AsyncFunction = (params?: Params, context?: RequestContext) => Promise<Response>;
export type AsyncFunctions<HashType> = {
    [Key in keyof HashType]: AsyncFunction;
};
export type Client<ResourcesType> = {
    [ResourceKey in keyof ResourcesType]: AsyncFunctions<ResourcesType[ResourceKey]>;
};
/**
 * @typedef ClientBuilder
 * @param {Object} manifestDefinition - manifest definition with at least the `resources` key
 * @param {Function} GatewayClassFactory - factory function that returns a gateway class
 */
export declare class ClientBuilder<Resources extends ResourceTypeConstraint> {
    Promise: PromiseConstructor;
    manifest: Manifest<Resources>;
    GatewayClassFactory: () => typeof Gateway;
    maxMiddlewareStackExecutionAllowed: number;
    constructor(manifestDefinition: ManifestOptions<Resources>, GatewayClassFactory: () => typeof Gateway | null, configs: GlobalConfigs);
    build(): Client<Resources>;
    private buildResource;
    private invokeMiddlewares;
}
export default ClientBuilder;
