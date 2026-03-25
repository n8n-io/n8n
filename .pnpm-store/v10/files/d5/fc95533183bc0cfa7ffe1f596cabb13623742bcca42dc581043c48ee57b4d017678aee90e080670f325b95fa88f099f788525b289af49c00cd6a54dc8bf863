import * as grpc from '@grpc/grpc-js';
import {CompatServiceDefinition, MethodDefinition, ServiceDefinition} from '.';

export type FromGrpcJsServiceDefinition<
  Service extends grpc.ServiceDefinition,
> = {
  [M in GrpcJsServiceMethodKeys<Service>]: FromGrpcJsMethodDefinition<
    Service[M]
  >;
};

/**
 * Removes index signature from ServiceDefinition type.
 *
 * See https://stackoverflow.com/questions/51465182/typescript-remove-index-signature-using-mapped-types
 */
export type GrpcJsServiceMethodKeys<Service extends grpc.ServiceDefinition> =
  keyof {
    [P in keyof Service as string extends P
      ? never
      : number extends P
      ? never
      : P]: Service[P];
  } &
    keyof Service;

export type FromGrpcJsMethodDefinition<Method> =
  Method extends grpc.MethodDefinition<infer Request, infer Response>
    ? MethodDefinition<
        Request,
        Request,
        Response,
        Response,
        Method['requestStream'],
        Method['responseStream']
      >
    : never;

export function fromGrpcJsServiceDefinition(
  definition: grpc.ServiceDefinition,
): ServiceDefinition {
  const result: ServiceDefinition = {};

  for (const [key, method] of Object.entries(definition)) {
    result[key] = {
      path: method.path,
      requestStream: method.requestStream,
      responseStream: method.responseStream,
      requestDeserialize: bytes =>
        method.requestDeserialize(Buffer.from(bytes)),
      requestSerialize: method.requestSerialize,
      responseDeserialize: bytes =>
        method.responseDeserialize(Buffer.from(bytes)),
      responseSerialize: method.responseSerialize,
      options: {},
    };
  }

  return result;
}

export function isGrpcJsServiceDefinition(
  definition: CompatServiceDefinition,
): definition is grpc.ServiceDefinition {
  return Object.values(definition).every(
    value =>
      typeof value === 'object' &&
      value != null &&
      typeof value.path === 'string',
  );
}
