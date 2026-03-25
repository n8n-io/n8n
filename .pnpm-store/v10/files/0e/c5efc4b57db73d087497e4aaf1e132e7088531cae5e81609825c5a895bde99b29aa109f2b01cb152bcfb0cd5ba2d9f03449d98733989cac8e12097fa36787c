import {Client} from '@grpc/grpc-js';
import {execute} from 'abort-controller-x';
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
import {UnaryClientMethod} from './Client';
import {wrapClientError} from './wrapClientError';

/** @internal */
export function createUnaryMethod<Request, Response>(
  definition: MethodDefinition<Request, unknown, unknown, Response>,
  client: Client,
  middleware: ClientMiddleware | undefined,
  defaultOptions: CallOptions,
): UnaryClientMethod<Request, Response> {
  const grpcMethodDefinition = toGrpcJsMethodDefinition(definition);

  const methodDescriptor: MethodDescriptor = {
    path: definition.path,
    requestStream: definition.requestStream,
    responseStream: definition.responseStream,
    options: definition.options,
  };

  async function* unaryMethod(
    request: Request,
    options: CallOptions,
  ): AsyncGenerator<never, Response, undefined> {
    if (isAsyncIterable(request)) {
      throw new Error(
        'A middleware passed invalid request to next(): expected a single message for unary method',
      );
    }

    const {
      metadata = Metadata(),
      signal = new AbortController().signal,
      onHeader,
      onTrailer,
    } = options;

    return await execute<Response>(signal, (resolve, reject) => {
      const call = client.makeUnaryRequest(
        grpcMethodDefinition.path,
        grpcMethodDefinition.requestSerialize,
        grpcMethodDefinition.responseDeserialize,
        request,
        convertMetadataToGrpcJs(metadata),
        (err, response) => {
          if (err != null) {
            reject(wrapClientError(err, definition.path));
          } else {
            resolve(response!);
          }
        },
      );

      call.on('metadata', metadata => {
        onHeader?.(convertMetadataFromGrpcJs(metadata));
      });
      call.on('status', status => {
        onTrailer?.(convertMetadataFromGrpcJs(status.metadata));
      });

      return () => {
        call.cancel();
      };
    });
  }

  const method =
    middleware == null
      ? unaryMethod
      : (request: Request, options: CallOptions) =>
          middleware(
            {
              method: methodDescriptor,
              requestStream: false,
              request,
              responseStream: false,
              next: unaryMethod,
            },
            options,
          );

  return async (request, options) => {
    const iterable = method(request, {
      ...defaultOptions,
      ...options,
    });
    const iterator = iterable[Symbol.asyncIterator]();

    let result = await iterator.next();

    while (true) {
      if (!result.done) {
        result = await iterator.throw(
          new Error(
            'A middleware yielded a message, but expected to only return a message for unary method',
          ),
        );

        continue;
      }

      if (result.value == null) {
        result = await iterator.throw(
          new Error(
            'A middleware returned void, but expected to return a message for unary method',
          ),
        );

        continue;
      }

      return result.value;
    }
  };
}
