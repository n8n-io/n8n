import Manifest, { ResourceTypeConstraint, ManifestOptions, GlobalConfigs } from './manifest.mjs';
import { a as RequestContext, b as Response } from './index-D3_z6QHM.mjs';
import Gateway from './gateway/gateway.mjs';
import { Params } from './types.mjs';
import './gateway/types.mjs';

type AsyncFunction = (params?: Params, context?: RequestContext) => Promise<Response>;
type AsyncFunctions<HashType> = {
    [Key in keyof HashType]: AsyncFunction;
};
type Client<ResourcesType> = {
    [ResourceKey in keyof ResourcesType]: AsyncFunctions<ResourcesType[ResourceKey]>;
};
/**
 * @typedef ClientBuilder
 * @param {Object} manifestDefinition - manifest definition with at least the `resources` key
 * @param {Function} GatewayClassFactory - factory function that returns a gateway class
 */
declare class ClientBuilder<Resources extends ResourceTypeConstraint> {
    Promise: PromiseConstructor;
    manifest: Manifest<Resources>;
    GatewayClassFactory: () => typeof Gateway;
    maxMiddlewareStackExecutionAllowed: number;
    constructor(manifestDefinition: ManifestOptions<Resources>, GatewayClassFactory: () => typeof Gateway | null, configs: GlobalConfigs);
    build(): Client<Resources>;
    private buildResource;
    private invokeMiddlewares;
}

export { type AsyncFunction, type AsyncFunctions, type Client, ClientBuilder, ClientBuilder as default };
