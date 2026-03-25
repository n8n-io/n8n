import { Channel } from '@grpc/grpc-js';
import { CallOptions, ClientMiddleware } from 'nice-grpc-common';
import { CompatServiceDefinition, NormalizedServiceDefinition, ServiceDefinition } from '../service-definitions';
import { Client } from './Client';
export type ClientFactory<CallOptionsExt = {}> = {
    /**
     * Attach a middleware to the client factory.
     *
     * This method returns a new client factory with the middleware attached.
     *
     * A middleware that is attached first, will be invoked last.
     *
     * @param middleware The middleware to attach.
     * @returns A new client factory with the middleware attached.
     */
    use<Ext>(middleware: ClientMiddleware<Ext, CallOptionsExt>): ClientFactory<CallOptionsExt & Ext>;
    /**
     * Create a client using the client factory.
     *
     * @param definition The service definition.
     * @param channel The channel to use.
     * @param defaultCallOptions Default call options per method, or `'*'` for all
     *     methods.
     */
    create<Service extends CompatServiceDefinition>(definition: Service, channel: Channel, defaultCallOptions?: DefaultCallOptions<NormalizedServiceDefinition<Service>, CallOptionsExt>): Client<Service, CallOptionsExt>;
};
export type DefaultCallOptions<Service extends ServiceDefinition, CallOptionsExt = {}> = {
    [K in keyof Service | '*']?: CallOptions & Partial<CallOptionsExt>;
};
/**
 * Create a client factory that can be used to create clients with middleware.
 */
export declare function createClientFactory(): ClientFactory;
/**
 * Create a client with no middleware.
 *
 * This is the same as calling `createClientFactory().create()`.
 */
export declare function createClient<Service extends CompatServiceDefinition>(definition: Service, channel: Channel, defaultCallOptions?: DefaultCallOptions<NormalizedServiceDefinition<Service>>): Client<Service>;
