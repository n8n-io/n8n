import {
  ServiceDefinition as GrpcJsServiceDefinition,
  MethodDefinition as GrpcJsMethodDefinition,
} from '@grpc/grpc-js';
import {
  fromGrpcJsServiceDefinition,
  FromGrpcJsServiceDefinition,
  isGrpcJsServiceDefinition,
} from './grpc-js';
import {
  fromTsProtoServiceDefinition,
  FromTsProtoServiceDefinition,
  isTsProtoServiceDefinition,
  TsProtoServiceDefinition,
} from './ts-proto';

/**
 * A nice-grpc service definition.
 */
export type ServiceDefinition = {
  [method: string]: AnyMethodDefinition;
};

/**
 * A nice-grpc method definition.
 */
export type MethodDefinition<
  RequestIn,
  RequestOut,
  ResponseIn,
  ResponseOut,
  RequestStream extends boolean = boolean,
  ResponseStream extends boolean = boolean,
> = {
  path: string;
  requestStream: RequestStream;
  responseStream: ResponseStream;
  requestSerialize(value: RequestIn): Uint8Array;
  requestDeserialize(bytes: Uint8Array): RequestOut;
  responseSerialize(value: ResponseIn): Uint8Array;
  responseDeserialize(bytes: Uint8Array): ResponseOut;
  options: {
    idempotencyLevel?: 'IDEMPOTENT' | 'NO_SIDE_EFFECTS';
  };
};

/**
 * A nice-grpc method definition with any request and response types.
 */
export type AnyMethodDefinition = MethodDefinition<any, any, any, any>;

/**
 * A service definition that can be converted to a nice-grpc service definition
 * i.e. a nice-grpc service definition, a grpc-js service definition or a
 * ts-proto service definition.
 */
export type CompatServiceDefinition =
  | ServiceDefinition
  | GrpcJsServiceDefinition
  | TsProtoServiceDefinition;

/**
 * A nice-grpc service definition converted from a CompatServiceDefinition.
 */
export type NormalizedServiceDefinition<
  Service extends CompatServiceDefinition,
> = Service extends ServiceDefinition
  ? Service
  : Service extends GrpcJsServiceDefinition
  ? FromGrpcJsServiceDefinition<Service>
  : Service extends TsProtoServiceDefinition
  ? FromTsProtoServiceDefinition<Service>
  : never;

/** @internal */
export function normalizeServiceDefinition(
  definition: CompatServiceDefinition,
): ServiceDefinition {
  if (isGrpcJsServiceDefinition(definition)) {
    return fromGrpcJsServiceDefinition(definition);
  } else if (isTsProtoServiceDefinition(definition)) {
    return fromTsProtoServiceDefinition(definition);
  } else {
    return definition;
  }
}

/** @internal */
export function toGrpcJsServiceDefinition(
  definition: ServiceDefinition,
): GrpcJsServiceDefinition {
  const result: {[key: string]: GrpcJsMethodDefinition<any, any>} = {};

  for (const [key, method] of Object.entries(definition)) {
    result[key] = toGrpcJsMethodDefinition(method);
  }

  return result;
}

/** @internal */
export function toGrpcJsMethodDefinition(
  definition: AnyMethodDefinition,
): GrpcJsMethodDefinition<any, any> {
  return {
    path: definition.path,
    requestStream: definition.requestStream,
    responseStream: definition.responseStream,
    requestDeserialize: definition.requestDeserialize,
    requestSerialize: value => Buffer.from(definition.requestSerialize(value)),
    responseDeserialize: definition.responseDeserialize,
    responseSerialize: value =>
      Buffer.from(definition.responseSerialize(value)),
  };
}
