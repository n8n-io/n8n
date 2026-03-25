import {CompatServiceDefinition, MethodDefinition, ServiceDefinition} from '.';

export type TsProtoServiceDefinition = {
  name: string;
  fullName: string;
  methods: {
    [method: string]: TsProtoMethodDefinition<any, any>;
  };
};

export type TsProtoMethodDefinition<Request, Response> = {
  name: string;
  requestType: TsProtoMessageType<Request>;
  requestStream: boolean;
  responseType: TsProtoMessageType<Response>;
  responseStream: boolean;
  options: {
    idempotencyLevel?: 'IDEMPOTENT' | 'NO_SIDE_EFFECTS';
    _unknownFields?: {};
  };
};

export type TsProtoMessageType<Message> = {
  encode(message: Message): ProtobufJsWriter;
  decode(input: Uint8Array): Message;
  fromPartial?(object: unknown): Message;
};

export type ProtobufJsWriter = {
  finish(): Uint8Array;
};

export type TsProtoMessageIn<Type extends TsProtoMessageType<any>> =
  Type['fromPartial'] extends Function
    ? Parameters<Type['fromPartial']>[0]
    : Type extends TsProtoMessageType<infer Message>
    ? Message
    : never;

export type FromTsProtoServiceDefinition<
  Service extends TsProtoServiceDefinition,
> = {
  [M in keyof Service['methods']]: FromTsProtoMethodDefinition<
    Service['methods'][M]
  >;
};

export type FromTsProtoMethodDefinition<Method> =
  Method extends TsProtoMethodDefinition<infer Request, infer Response>
    ? MethodDefinition<
        TsProtoMessageIn<Method['requestType']>,
        Request,
        TsProtoMessageIn<Method['responseType']>,
        Response,
        Method['requestStream'],
        Method['responseStream']
      >
    : never;

export function fromTsProtoServiceDefinition(
  definition: TsProtoServiceDefinition,
): ServiceDefinition {
  const result: ServiceDefinition = {};

  for (const [key, method] of Object.entries(definition.methods)) {
    const requestEncode = method.requestType.encode;
    const requestFromPartial = method.requestType.fromPartial;
    const responseEncode = method.responseType.encode;
    const responseFromPartial = method.responseType.fromPartial;

    result[key] = {
      path: `/${definition.fullName}/${method.name}`,
      requestStream: method.requestStream,
      responseStream: method.responseStream,
      requestDeserialize: method.requestType.decode,
      requestSerialize:
        requestFromPartial != null
          ? value => requestEncode(requestFromPartial(value)).finish()
          : value => requestEncode(value).finish(),
      responseDeserialize: method.responseType.decode,
      responseSerialize:
        responseFromPartial != null
          ? value => responseEncode(responseFromPartial(value)).finish()
          : value => responseEncode(value).finish(),
      options: method.options,
    };
  }

  return result;
}

export function isTsProtoServiceDefinition(
  definition: CompatServiceDefinition,
): definition is TsProtoServiceDefinition {
  return (
    'name' in definition && 'fullName' in definition && 'methods' in definition
  );
}
