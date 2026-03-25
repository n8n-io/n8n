import {
  ChannelOptions,
  Server as GrpcServer,
  ServerCredentials,
  UntypedServiceImplementation,
} from '@grpc/grpc-js';
import {ServerMiddleware, composeServerMiddleware} from 'nice-grpc-common';
import {
  CompatServiceDefinition,
  normalizeServiceDefinition,
  ServiceDefinition,
  toGrpcJsServiceDefinition,
} from '../service-definitions';
import {createBidiStreamingMethodHandler} from './handleBidiStreamingCall';
import {createClientStreamingMethodHandler} from './handleClientStreamingCall';
import {createServerStreamingMethodHandler} from './handleServerStreamingCall';
import {createUnaryMethodHandler} from './handleUnaryCall';
import {ServiceImplementation} from './ServiceImplementation';

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
  use<Ext>(
    middleware: ServerMiddleware<Ext, CallContextExt>,
  ): Server<CallContextExt & Ext>;
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
  with<Ext>(
    middleware: ServerMiddleware<Ext, CallContextExt>,
  ): ServerAddBuilder<CallContextExt & Ext>;
  /**
   * Add a service to the server.
   *
   * @param definition The service definition obtained from the generated code.
   * @param implementation The service implementation.
   */
  add<Service extends CompatServiceDefinition>(
    definition: Service,
    implementation: ServiceImplementation<Service, CallContextExt>,
  ): void;
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
  with<Ext>(
    middleware: ServerMiddleware<Ext, CallContextExt>,
  ): ServerAddBuilder<CallContextExt & Ext>;
  add<Service extends CompatServiceDefinition>(
    definition: Service,
    implementation: ServiceImplementation<Service, CallContextExt>,
  ): void;
};

/**
 * Create a new server.
 *
 * @param options Optional channel options.
 * @returns The new server.
 */
export function createServer(options: ChannelOptions = {}): Server {
  return createServerWithMiddleware(options);
}

function createServerWithMiddleware<CallContextExt = {}>(
  options: ChannelOptions,
  middleware?: ServerMiddleware<CallContextExt>,
): Server<CallContextExt> {
  const services: Array<{
    definition: ServiceDefinition;
    middleware?: ServerMiddleware<any, any>;
    implementation: ServiceImplementation<ServiceDefinition, any>;
  }> = [];

  let server: GrpcServer | undefined;

  function createAddBuilder<CallContextExt>(
    middleware?: ServerMiddleware<CallContextExt>,
  ): ServerAddBuilder<CallContextExt> {
    return {
      with<Ext>(newMiddleware: ServerMiddleware<Ext, CallContextExt>) {
        return createAddBuilder(
          middleware == null
            ? (newMiddleware as ServerMiddleware<Ext & CallContextExt>)
            : composeServerMiddleware(middleware, newMiddleware),
        );
      },
      add(definition, implementation) {
        if (server != null) {
          throw new Error('server.add() must be used before listen()');
        }

        services.push({
          definition: normalizeServiceDefinition(definition),
          middleware,
          implementation,
        });
      },
    };
  }

  return {
    use<Ext>(newMiddleware: ServerMiddleware<Ext, CallContextExt>) {
      if (server != null) {
        throw new Error('server.use() must be used before listen()');
      }

      if (services.length > 0) {
        throw new Error('server.use() must be used before adding any services');
      }

      return createServerWithMiddleware(
        options,
        middleware == null
          ? (newMiddleware as ServerMiddleware<Ext & CallContextExt>)
          : composeServerMiddleware(middleware, newMiddleware),
      );
    },

    ...createAddBuilder(middleware),

    async listen(address, credentials) {
      if (server != null) {
        throw new Error('server.listen() has already been called');
      }

      server = new GrpcServer(options);

      for (const {definition, middleware, implementation} of services) {
        const grpcImplementation: UntypedServiceImplementation = {};

        for (const [methodName, methodDefinition] of Object.entries(
          definition,
        )) {
          const methodImplementation = (implementation as any)[methodName].bind(
            implementation,
          );

          if (!methodDefinition.requestStream) {
            if (!methodDefinition.responseStream) {
              grpcImplementation[methodName] = createUnaryMethodHandler(
                methodDefinition,
                methodImplementation,
                middleware,
              );
            } else {
              grpcImplementation[methodName] =
                createServerStreamingMethodHandler(
                  methodDefinition,
                  methodImplementation,
                  middleware,
                );
            }
          } else {
            if (!methodDefinition.responseStream) {
              grpcImplementation[methodName] =
                createClientStreamingMethodHandler(
                  methodDefinition,
                  methodImplementation,
                  middleware,
                );
            } else {
              grpcImplementation[methodName] = createBidiStreamingMethodHandler(
                methodDefinition,
                methodImplementation,
                middleware,
              );
            }
          }
        }

        server.addService(
          toGrpcJsServiceDefinition(definition),
          grpcImplementation,
        );
      }

      const port = await new Promise<number>((resolve, reject) => {
        server!.bindAsync(
          address,
          credentials ?? ServerCredentials.createInsecure(),
          (err, port) => {
            if (err != null) {
              server = undefined;
              reject(err);
            } else {
              resolve(port);
            }
          },
        );
      });

      return port;
    },

    async shutdown() {
      if (server == null) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        server!.tryShutdown(err => {
          if (err != null) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      server = undefined;
    },

    forceShutdown() {
      if (server == null) {
        return;
      }

      server!.forceShutdown();
      server = undefined;
    },
  };
}
