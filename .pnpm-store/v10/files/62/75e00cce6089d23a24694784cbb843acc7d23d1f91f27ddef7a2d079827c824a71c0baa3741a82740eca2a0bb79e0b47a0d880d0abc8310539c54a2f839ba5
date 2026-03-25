import { MethodDescriptor, MethodDescriptorParams } from './method-descriptor';
import type { ParameterEncoderFn } from './types';
import type { GatewayConfiguration } from './gateway/types';
import type { Gateway } from './gateway/index';
import { Context, Middleware, MiddlewareDescriptor, MiddlewareParams } from './middleware/index';
export interface GlobalConfigs {
    context: Context;
    middleware: Middleware[];
    Promise: PromiseConstructor | null;
    fetch: typeof fetch | null;
    gateway: typeof Gateway | null;
    gatewayConfigs: GatewayConfiguration;
    maxMiddlewareStackExecutionAllowed: number;
}
export type ResourceTypeConstraint = {
    [resourceName: string]: {
        [methodName: string]: Omit<MethodDescriptorParams, 'host'> & {
            host?: string;
        };
    };
};
export interface ManifestOptions<Resources extends ResourceTypeConstraint> {
    allowResourceHostOverride?: boolean;
    authAttr?: string;
    bodyAttr?: string;
    clientId?: string;
    gatewayConfigs?: Partial<GatewayConfiguration>;
    headersAttr?: string;
    host: string;
    hostAttr?: string;
    middleware?: Middleware[];
    parameterEncoder?: ParameterEncoderFn;
    resources?: Resources;
    signalAttr?: string;
    timeoutAttr?: string;
    /**
     * @deprecated - use `middleware` instead
     */
    middlewares?: Middleware[];
    ignoreGlobalMiddleware?: boolean;
}
export type Method = {
    name: string;
    descriptor: MethodDescriptor;
};
type EachResourceCallbackFn = (name: string, methods: Method[]) => void;
type CreateMiddlewareParams = Partial<Omit<MiddlewareParams, 'resourceName' | 'resourceMethod'>> & Pick<MiddlewareParams, 'resourceName' | 'resourceMethod'>;
/**
 * @typedef Manifest
 * @param {Object} obj
 *   @param {Object} obj.gatewayConfigs - default: base values from mappersmith
 *   @param {Object} obj.ignoreGlobalMiddleware - default: false
 *   @param {Object} obj.resources - default: {}
 *   @param {Array}  obj.middleware or obj.middlewares - default: []
 * @param {Object} globalConfigs
 */
export declare class Manifest<Resources extends ResourceTypeConstraint> {
    allowResourceHostOverride: boolean;
    authAttr?: string;
    bodyAttr?: string;
    clientId: string | null;
    context: Context;
    gatewayConfigs: GatewayConfiguration;
    headersAttr?: string;
    host: string;
    hostAttr?: string;
    middleware: Middleware[];
    parameterEncoder: ParameterEncoderFn;
    resources: Resources;
    signalAttr?: string;
    timeoutAttr?: string;
    constructor(options: ManifestOptions<Resources>, { gatewayConfigs, middleware, context }: GlobalConfigs);
    eachResource(callback: EachResourceCallbackFn): void;
    private eachMethod;
    createMethodDescriptor(resourceName: string, methodName: string): MethodDescriptor;
    /**
     * @param {Object} args
     *   @param {String|Null} args.clientId
     *   @param {String} args.resourceName
     *   @param {String} args.resourceMethod
     *   @param {Object} args.context
     *   @param {Boolean} args.mockRequest
     *
     * @return {Array<Object>}
     */
    createMiddleware(args: CreateMiddlewareParams): (MiddlewareDescriptor & Partial<MiddlewareDescriptor>)[];
}
export default Manifest;
