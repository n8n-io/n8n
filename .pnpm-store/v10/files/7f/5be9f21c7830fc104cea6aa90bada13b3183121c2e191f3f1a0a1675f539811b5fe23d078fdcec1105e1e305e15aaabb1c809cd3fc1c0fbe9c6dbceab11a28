import { ChannelOptions, ServerCredentials } from '@grpc/grpc-js';
import { ServerMiddleware } from 'nice-grpc-common';
import { CompatServiceDefinition } from '../service-definitions';
import { ServiceImplementation } from './ServiceImplementation';
export type Server<CallContextExt = {}> = {
    /**
     * Attach a middleware to the server.
     *
     * This method returns a new server with the middleware attached.
     *
     * A middleware that is attached first, will be invoked first.
     *
     * This method must be used before adding any services or calling `listen()`.
     *
     * @param middleware The middleware to attach.
     * @returns A new server with the middleware attached.
     */
    use<Ext>(middleware: ServerMiddleware<Ext, CallContextExt>): Server<CallContextExt & Ext>;
    /**
     * Attach a middleware per service:
     *
     * ```ts
     * server.with(middleware).add(TestDefinition, implementation)
     * ```
     *
     * This will attach the middleware only to the service in the chained `add()`
     * call. Multiple `with()` calls can be chained to attach multiple middleware.
     *
     * @param middleware The middleware to attach.
     * @returns A builder that can be used to add services with the middleware
     *     attached.
     */
    with<Ext>(middleware: ServerMiddleware<Ext, CallContextExt>): ServerAddBuilder<CallContextExt & Ext>;
    /**
     * Add a service to the server.
     *
     * @param definition The service definition obtained from the generated code.
     * @param implementation The service implementation.
     */
    add<Service extends CompatServiceDefinition>(definition: Service, implementation: ServiceImplementation<Service, CallContextExt>): void;
    /**
     * Start listening on given 'host:port'.
     *
     * Use 'localhost:0' to bind to a random port.
     *
     * Returns port that the server is bound to.
     *
     * @param address The address to listen on, in the form 'host:port'.
     * @param credentials Optional credentials object that is usually created by
     *     calling `ServerCredentials.createSsl()` or
     *     `ServerCredentials.createInsecure()`. If not specified, the server will
     *     use `ServerCredentials.createInsecure()`.
     * @returns A promise that resolves to the port that the server is bound to.
     */
    listen(address: string, credentials?: ServerCredentials): Promise<number>;
    /**
     * Gracefully shut down the server, waiting for all existing calls to finish.
     */
    shutdown(): Promise<void>;
    /**
     * Forcefully shut down the server, cancelling all existing calls.
     *
     * The client will receive a gRPC error with code `CANCELLED`.
     */
    forceShutdown(): void;
};
export type ServerAddBuilder<CallContextExt> = {
    with<Ext>(middleware: ServerMiddleware<Ext, CallContextExt>): ServerAddBuilder<CallContextExt & Ext>;
    add<Service extends CompatServiceDefinition>(definition: Service, implementation: ServiceImplementation<Service, CallContextExt>): void;
};
/**
 * Create a new server.
 *
 * @param options Optional channel options.
 * @returns The new server.
 */
export declare function createServer(options?: ChannelOptions): Server;
