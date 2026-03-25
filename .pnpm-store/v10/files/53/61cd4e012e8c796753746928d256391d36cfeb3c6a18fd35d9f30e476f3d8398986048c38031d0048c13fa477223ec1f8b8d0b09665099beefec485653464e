import { MethodConfig, ServiceConfig } from './service-config';
import { StatusObject } from './call-interface';
import { Endpoint } from './subchannel-address';
import { GrpcUri } from './uri-parser';
import { ChannelOptions } from './channel-options';
import { Metadata } from './metadata';
import { Status } from './constants';
import { Filter, FilterFactory } from './filter';
export interface CallConfig {
    methodConfig: MethodConfig;
    onCommitted?: () => void;
    pickInformation: {
        [key: string]: string;
    };
    status: Status;
    dynamicFilterFactories: FilterFactory<Filter>[];
}
/**
 * Selects a configuration for a method given the name and metadata. Defined in
 * https://github.com/grpc/proposal/blob/master/A31-xds-timeout-support-and-config-selector.md#new-functionality-in-grpc
 */
export interface ConfigSelector {
    invoke(methodName: string, metadata: Metadata, channelId: number): CallConfig;
    unref(): void;
}
/**
 * A listener object passed to the resolver's constructor that provides name
 * resolution updates back to the resolver's owner.
 */
export interface ResolverListener {
    /**
     * Called whenever the resolver has new name resolution results to report
     * @param addressList The new list of backend addresses
     * @param serviceConfig The new service configuration corresponding to the
     *     `addressList`. Will be `null` if no service configuration was
     *     retrieved or if the service configuration was invalid
     * @param serviceConfigError If non-`null`, indicates that the retrieved
     *     service configuration was invalid
     */
    onSuccessfulResolution(addressList: Endpoint[], serviceConfig: ServiceConfig | null, serviceConfigError: StatusObject | null, configSelector: ConfigSelector | null, attributes: {
        [key: string]: unknown;
    }): void;
    /**
     * Called whenever a name resolution attempt fails.
     * @param error Describes how resolution failed
     */
    onError(error: StatusObject): void;
}
/**
 * A resolver class that handles one or more of the name syntax schemes defined
 * in the [gRPC Name Resolution document](https://github.com/grpc/grpc/blob/master/doc/naming.md)
 */
export interface Resolver {
    /**
     * Indicates that the caller wants new name resolution data. Calling this
     * function may eventually result in calling one of the `ResolverListener`
     * functions, but that is not guaranteed. Those functions will never be
     * called synchronously with the constructor or updateResolution.
     */
    updateResolution(): void;
    /**
     * Discard all resources owned by the resolver. A later call to
     * `updateResolution` should reinitialize those resources.  No
     * `ResolverListener` callbacks should be called after `destroy` is called
     * until `updateResolution` is called again.
     */
    destroy(): void;
}
export interface ResolverConstructor {
    new (target: GrpcUri, listener: ResolverListener, channelOptions: ChannelOptions): Resolver;
    /**
     * Get the default authority for a target. This loosely corresponds to that
     * target's hostname. Throws an error if this resolver class cannot parse the
     * `target`.
     * @param target
     */
    getDefaultAuthority(target: GrpcUri): string;
}
/**
 * Register a resolver class to handle target names prefixed with the `prefix`
 * string. This prefix should correspond to a URI scheme name listed in the
 * [gRPC Name Resolution document](https://github.com/grpc/grpc/blob/master/doc/naming.md)
 * @param prefix
 * @param resolverClass
 */
export declare function registerResolver(scheme: string, resolverClass: ResolverConstructor): void;
/**
 * Register a default resolver to handle target names that do not start with
 * any registered prefix.
 * @param resolverClass
 */
export declare function registerDefaultScheme(scheme: string): void;
/**
 * Create a name resolver for the specified target, if possible. Throws an
 * error if no such name resolver can be created.
 * @param target
 * @param listener
 */
export declare function createResolver(target: GrpcUri, listener: ResolverListener, options: ChannelOptions): Resolver;
/**
 * Get the default authority for the specified target, if possible. Throws an
 * error if no registered name resolver can parse that target string.
 * @param target
 */
export declare function getDefaultAuthority(target: GrpcUri): string;
export declare function mapUriDefaultScheme(target: GrpcUri): GrpcUri | null;
