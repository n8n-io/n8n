import {Channel, makeClientConstructor} from '@grpc/grpc-js';
import {
  CallOptions,
  ClientMiddleware,
  composeClientMiddleware,
} from 'nice-grpc-common';
import {
  AnyMethodDefinition,
  CompatServiceDefinition,
  NormalizedServiceDefinition,
  normalizeServiceDefinition,
  ServiceDefinition,
} from '../service-definitions';
import {Client} from './Client';
import {createBidiStreamingMethod} from './createBidiStreamingMethod';
import {createClientStreamingMethod} from './createClientStreamingMethod';
import {createServerStreamingMethod} from './createServerStreamingMethod';
import {createUnaryMethod} from './createUnaryMethod';

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
  use<Ext>(
    middleware: ClientMiddleware<Ext, CallOptionsExt>,
  ): ClientFactory<CallOptionsExt & Ext>;
  /**
   * Create a client using the client factory.
   *
   * @param definition The service definition.
   * @param channel The channel to use.
   * @param defaultCallOptions Default call options per method, or `'*'` for all
   *     methods.
   */
  create<Service extends CompatServiceDefinition>(
    definition: Service,
    channel: Channel,
    defaultCallOptions?: DefaultCallOptions<
      NormalizedServiceDefinition<Service>,
      CallOptionsExt
    >,
  ): Client<Service, CallOptionsExt>;
};

export type DefaultCallOptions<
  Service extends ServiceDefinition,
  CallOptionsExt = {},
> = {
  [K in keyof Service | '*']?: CallOptions & Partial<CallOptionsExt>;
};

/**
 * Create a client factory that can be used to create clients with middleware.
 */
export function createClientFactory(): ClientFactory {
  return createClientFactoryWithMiddleware();
}

/**
 * Create a client with no middleware.
 *
 * This is the same as calling `createClientFactory().create()`.
 */
export function createClient<Service extends CompatServiceDefinition>(
  definition: Service,
  channel: Channel,
  defaultCallOptions?: DefaultCallOptions<NormalizedServiceDefinition<Service>>,
): Client<Service> {
  return createClientFactory().create(definition, channel, defaultCallOptions);
}

function createClientFactoryWithMiddleware<CallOptionsExt = {}>(
  middleware?: ClientMiddleware<CallOptionsExt>,
): ClientFactory<CallOptionsExt> {
  return {
    use<Ext>(newMiddleware: ClientMiddleware<Ext, CallOptionsExt>) {
      return createClientFactoryWithMiddleware(
        middleware == null
          ? (newMiddleware as ClientMiddleware<Ext & CallOptionsExt>)
          : composeClientMiddleware(middleware, newMiddleware),
      );
    },

    create<Service extends CompatServiceDefinition>(
      definition: Service,
      channel: Channel,
      defaultCallOptions: DefaultCallOptions<
        NormalizedServiceDefinition<Service>,
        CallOptionsExt
      > = {},
    ) {
      const constructor = makeClientConstructor({}, '');
      const grpcClient = new constructor('', null!, {
        channelOverride: channel,
      });

      type NormalizedService = NormalizedServiceDefinition<Service>;

      const client = {} as {
        [K in keyof NormalizedService]: Function;
      };

      const methodEntries = Object.entries(
        normalizeServiceDefinition(definition),
      ) as Array<[keyof NormalizedService, AnyMethodDefinition]>;

      for (const [methodName, methodDefinition] of methodEntries) {
        const defaultOptions = {
          ...defaultCallOptions['*'],
          ...defaultCallOptions[methodName],
        } as CallOptions;

        if (!methodDefinition.requestStream) {
          if (!methodDefinition.responseStream) {
            client[methodName] = createUnaryMethod(
              methodDefinition,
              grpcClient,
              middleware,
              defaultOptions,
            );
          } else {
            client[methodName] = createServerStreamingMethod(
              methodDefinition,
              grpcClient,
              middleware,
              defaultOptions,
            );
          }
        } else {
          if (!methodDefinition.responseStream) {
            client[methodName] = createClientStreamingMethod(
              methodDefinition,
              grpcClient,
              middleware,
              defaultOptions,
            );
          } else {
            client[methodName] = createBidiStreamingMethod(
              methodDefinition,
              grpcClient,
              middleware,
              defaultOptions,
            );
          }
        }
      }

      return client as Client<Service, CallOptionsExt>;
    },
  };
}
