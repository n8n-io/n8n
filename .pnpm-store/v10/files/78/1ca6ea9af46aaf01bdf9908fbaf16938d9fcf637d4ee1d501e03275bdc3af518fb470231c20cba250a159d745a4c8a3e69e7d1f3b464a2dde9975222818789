import {Client} from '@grpc/grpc-js';
import {throwIfAborted} from 'abort-controller-x';
import {
  CallOptions,
  ClientMiddleware,
  Metadata,
  MethodDescriptor,
} from 'nice-grpc-common';
import {
  MethodDefinition,
  toGrpcJsMethodDefinition,
} from '../service-definitions';
import {
  convertMetadataFromGrpcJs,
  convertMetadataToGrpcJs,
} from '../utils/convertMetadata';
import {isAsyncIterable} from '../utils/isAsyncIterable';
import {readableToAsyncIterable} from '../utils/readableToAsyncIterable';
import {ServerStreamingClientMethod} from './Client';
import {wrapClientError} from './wrapClientError';

/** @internal */
export function createServerStreamingMethod<Request, Response>(
  definition: MethodDefinition<Request, unknown, unknown, Response>,
  client: Client,
  middleware: ClientMiddleware | undefined,
  defaultOptions: CallOptions,
): ServerStreamingClientMethod<Request, Response> {
  const grpcMethodDefinition = toGrpcJsMethodDefinition(definition);

  const methodDescriptor: MethodDescriptor = {
    path: definition.path,
    requestStream: definition.requestStream,
    responseStream: definition.responseStream,
    options: definition.options,
  };

  async function* serverStreamingMethod(
    request: Request,
    options: CallOptions,
  ): AsyncGenerator<Response, void, undefined> {
    if (isAsyncIterable(request)) {
      throw new Error(
        'A middleware passed invalid request to next(): expected a single message for server streaming method',
      );
    }

    const {metadata = Metadata(), onHeader, onTrailer} = options;

    const signal = options.signal ?? new AbortController().signal;

    const call = client.makeServerStreamRequest(
      grpcMethodDefinition.path,
      grpcMethodDefinition.requestSerialize,
      grpcMethodDefinition.responseDeserialize,
      request,
      convertMetadataToGrpcJs(metadata),
    );

    call.on('metadata', metadata => {
      onHeader?.(convertMetadataFromGrpcJs(metadata));
    });
    call.on('status', status => {
      onTrailer?.(convertMetadataFromGrpcJs(status.metadata));
    });

    const abortListener = () => {
      call.cancel();
    };

    signal.addEventListener('abort', abortListener);

    try {
      yield* readableToAsyncIterable(call);
    } catch (err) {
      throw wrapClientError(err, definition.path);
    } finally {
      signal.removeEventListener('abort', abortListener);
      throwIfAborted(signal);
      call.cancel();
    }
  }

  const method =
    middleware == null
      ? serverStreamingMethod
      : (request: Request, options: CallOptions) =>
          middleware(
            {
              method: methodDescriptor,
              requestStream: false,
              request,
              responseStream: true,
              next: serverStreamingMethod,
            },
            options,
          );

  return (request, options) => {
    const iterable = method(request, {
      ...defaultOptions,
      ...options,
    });
    const iterator = iterable[Symbol.asyncIterator]();

    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            const result = await iterator.next();

            if (result.done && result.value != null) {
              return await iterator.throw(
                new Error(
                  'A middleware returned a message, but expected to return void for server streaming method',
                ),
              );
            }

            return result;
          },
          return() {
            return iterator.return();
          },
          throw(err) {
            return iterator.throw(err);
          },
        };
      },
    };
  };
}
