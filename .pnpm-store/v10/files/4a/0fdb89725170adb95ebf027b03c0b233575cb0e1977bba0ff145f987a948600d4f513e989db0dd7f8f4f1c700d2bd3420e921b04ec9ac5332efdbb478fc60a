// Note: These typings are incomplete (https://github.com/mtth/avsc/pull/134).
// In particular, they do not contain entries for functions available in the
// browser (functions/methods in etc/browser).

// TODO: Wherever the type is just `any`, it was probably generated
// automatically. Either finish documenting the type signature or document why
// `any` is appropriate.

import * as stream from 'stream';
import { EventEmitter } from 'events';

//"virtual" namespace (no JS, just types) for Avro Schema
declare namespace schema {
  export type AvroSchema = DefinedType | DefinedType[];
  type DefinedType = PrimitiveType | ComplexType | LogicalType | string;
  type PrimitiveType = 'null' | 'boolean' | 'int' | 'long' | 'float' | 'double' | 'bytes' | 'string';
  type ComplexType = NamedType | RecordType | EnumType | MapType | ArrayType | FixedType;
  type LogicalType = ComplexType & LogicalTypeExtension;

  interface NamedType {
    type: PrimitiveType
  }

  interface RecordType {
    type: "record" | "error";
    name: string;
    namespace?: string;
    doc?: string;
    aliases?: string[];
    fields: {
      name: string;
      doc?: string;
      type: Schema;
      default?: any;
      order?: "ascending" | "descending" | "ignore";
    }[];
  }

  interface EnumType {
    type: "enum";
    name: string;
    namespace?: string;
    aliases?: string[];
    doc?: string;
    symbols: string[];
    default?: string;
  }

  interface ArrayType {
    type: "array";
    items: Schema;
  }

  interface MapType {
    type: "map";
    values: Schema;
  }

  interface FixedType {
    type: "fixed";
    name: string;
    aliases?: string[];
    size: number;
  }
  interface LogicalTypeExtension {
    logicalType: string;
    [param: string]: any;
  }
}

//Types of Options/arguments

type Schema = Type | schema.AvroSchema;

type Callback<V, Err = any> = (err: Err | null, value?: V) => void;


type Codec = (buffer: Buffer, callback: Callback<Buffer>) => void;

interface CodecOptions {
  [name: string]: Codec;
}

interface DecoderOptions {
  noDecode: boolean;
  readerSchema: string | object | Type;
  codecs: CodecOptions;
  parseHook: (schema: Schema) => Type
}

interface EncoderOptions {
  blockSize: number;
  codec: string;
  codecs: CodecOptions;
  writeHeader: boolean | 'always' | 'never' | 'auto';
  syncMarker: Buffer;
}

interface ForSchemaOptions {
  assertLogicalTypes: boolean;
  logicalTypes: { [type: string]: new (schema: Schema, opts?: any) => types.LogicalType; };
  namespace: string;
  noAnonymousTypes: boolean;
  omitRecordMethods: boolean;
  registry: { [name: string]: Type };
  typeHook: (schema: Schema, opts: ForSchemaOptions) => Type | undefined;
  wrapUnions: boolean | 'auto' | 'always' | 'never';
}

interface TypeOptions extends ForSchemaOptions {
  strictDefaults: boolean;
}

interface ForValueOptions extends TypeOptions {
  emptyArrayType: Type;
  valueHook: (val: any, opts: ForValueOptions) => Type;
}

interface CloneOptions {
  coerceBuffers: boolean;
  fieldHook: (field: types.Field, value: any, type: Type) => any;
  qualifyNames: boolean;
  skipMissingFields: boolean;
  wrapUnions: boolean;
}
interface IsValidOptions {
  noUndeclaredFields: boolean;
  errorHook: (path: string[], val: any, type: Type) => void
}
interface AssembleOptions {
  importHook: (filePath: string, type: 'idl', callback: Callback<object>) => void;
}

interface SchemaOptions {
  exportAttrs: boolean;
  noDeref: boolean;
}

interface CreateResolverOptions {
  ignoreNamespaces: boolean;
}

declare class Resolver {
  //no public methods
}

//exported functions

export function assembleProtocol(filePath: string, opts: Partial<AssembleOptions>, callback: Callback<object>): void;
export function assembleProtocol(filePath: string, callback: Callback<object>): void;
export function createFileDecoder(fileName: string, opts?: Partial<DecoderOptions>): streams.BlockDecoder;
export function createFileEncoder(filePath: string, schema: Schema, opts?: Partial<EncoderOptions>): streams.BlockEncoder;
export function createBlobEncoder(schema: Schema, opts?: Partial<EncoderOptions>): stream.Duplex;
export function createBlobDecoder(blob: Blob, opts?: Partial<DecoderOptions>): streams.BlockDecoder;
export function discoverProtocol(transport: Service.Transport, options: any, callback: Callback<any>): void;
export function discoverProtocol(transport: Service.Transport, callback: Callback<any>): void;
export function extractFileHeader(filePath: string, options?: any): any;
export function parse(schemaOrProtocolIdl: string, options?: any): any; // TODO protocol literal or Type
export function readProtocol(protocolIdl: string, options?: Partial<DecoderOptions>): any;
export function readSchema(schemaIdl: string, options?: Partial<DecoderOptions>): Schema;


// TODO more specific types than `any`
export class Type {
  clone(val: any, opts?: Partial<CloneOptions>): any;
  compare(val1: any, val2: any): number;
  compareBuffers(buf1: Buffer, buf2: Buffer): number;
  createResolver(type: Type, opts?: Partial<CreateResolverOptions>): Resolver;
  decode(buf: Buffer, pos?: number, resolver?: Resolver): { value: any, offset: number};
  encode(val: any, buf: Buffer, pos?: number): number;
  equals(type: Type): boolean;
  fingerprint(algorithm?: string): Buffer;
  fromBuffer(buffer: Buffer, resolver?: Resolver, noCheck?: boolean): any;
  fromString(str: string): any;
  inspect(): string;
  isValid(val: any, opts?: Partial<IsValidOptions>): boolean;
  random(): Type;
  schema(opts?: Partial<SchemaOptions>): Schema;
  toBuffer(value: any): Buffer;
  toJSON(): object;
  toString(val?: any): string;
  wrap(val: any): any;
  readonly aliases: string[] | undefined;
  readonly doc: string | undefined;
  readonly name: string | undefined;
  readonly branchName: string | undefined;
  readonly typeName: string;
  static forSchema(schema: Schema, opts?: Partial<ForSchemaOptions>): Type;
  static forTypes(types: Type[], opts?: Partial<TypeOptions>): Type;
  static forValue(value: object, opts?: Partial<ForValueOptions>): Type;
  static isType(arg: any, ...prefix: string[]): boolean;
}

export class Service {
  constructor(name: any, messages: any, types: any, ptcl: any, server: any);
  createClient(options?: Partial<Service.ClientOptions>): Service.Client;
  createServer(options?: Partial<Service.ServerOptions>): Service.Server;
  equals(args: any): boolean;  // deprecated
  inspect(): string;
  message(name: string): any;
  type(name: string): Type | undefined;

  readonly doc: string | undefined;
  readonly hash: Buffer;
  readonly messages: any[];
  readonly name: string;
  readonly protocol: any;
  readonly types: Type[];

  static compatible(client: Service.Client, server: Service.Server): boolean;
  static forProtocol(protocol: any, options?: any): Service;
  static isService(obj: any): boolean;
}

export namespace Service {
  interface ClientChannel extends EventEmitter {
    readonly client: Client;
    readonly destroyed: boolean;
    readonly draining: boolean;
    readonly pending: number;
    readonly timeout: number;
    ping(timeout?: number, cb?: any): void;
    destroy(noWait?: boolean): void;
  }

  interface ServerChannel extends EventEmitter {
    readonly destroyed: boolean;
    readonly draining: boolean;
    readonly pending: number;
    readonly server: Server;
    destroy(noWait?: boolean): void;
  }

  interface ClientOptions {
    buffering: boolean;
    channelPolicy: any;
    strictTypes: boolean;
    timeout: number;
    remoteProtocols: boolean;
    transport?: Transport;
  }

  interface ServerOptions {
    objectMode: boolean;
  }



  type TransportFunctionCallback = (err: Error|null|undefined, res?: stream.Stream) => void;
  type TransportFunction = (cb: TransportFunctionCallback) => stream.Stream; // TODO

  type Transport = stream.Duplex | TransportFunction;

  interface ChannelCreateOptions {
    objectMode: boolean;
  }

  interface ChannelDestroyOptions {
    noWait: boolean;
  }

  class Server extends EventEmitter {
    constructor(svc: any, opts: any);

    readonly service: Service;
    // on<message>()

    activeChannels(): ServerChannel[];
    createChannel(transport: Transport, options?: Partial<ChannelCreateOptions>): ServerChannel;
    onMessage<T>(name: string, handler: (arg1: any, callback: Callback<T>) => void): this;
    remoteProtocols(): any[];
    use(...args: any[]): this;
  }

  class Client extends EventEmitter {
    constructor(svc: any, opts: any);
    activeChannels(): ClientChannel[];
    createChannel(transport: Transport, options?: Partial<ChannelCreateOptions>): ClientChannel;
    destroyChannels(options?: Partial<ChannelDestroyOptions>): void;
    emitMessage<T>(name: string, req: any, options?: any, callback?: Callback<T>): void // TODO
    remoteProtocols(): any[];
    use(...args: any[]): this;
  }
}

export namespace streams {

  class BlockDecoder extends stream.Duplex {
    constructor(opts?: Partial<DecoderOptions>);
    static defaultCodecs(): CodecOptions;

    //should add meta-data listener, but regrettably that requires all other events to be repeated
    //here, or else they won't show up in code-completion. To avoid clutter, the meta-data event
    //is therefore omitted from this stream.
  }

  class BlockEncoder extends stream.Duplex {
    constructor(schema: Schema, opts?: Partial<EncoderOptions>);
    static defaultCodecs(): CodecOptions;
  }

  class RawDecoder extends stream.Duplex {
    constructor(schema: Schema, opts?: { decode?: boolean });
  }

  class RawEncoder extends stream.Duplex {
    constructor(schema: Schema, opts?: { batchSize?: number });
  }
}

export namespace types {
  class ArrayType extends Type {
    constructor(schema: Schema, opts: any);
    readonly itemsType: Type;
    random(): ArrayType;
  }

  class BooleanType extends Type {  // TODO: Document this on the wiki
    constructor();
    random(): BooleanType;
  }

  class BytesType extends Type {  // TODO: Document this on the wiki
    constructor();
    random(): BytesType;
  }

  class DoubleType extends Type {  // TODO: Document this on the wiki
    constructor();
    random(): DoubleType;
  }

  class EnumType extends Type {
    constructor(schema: Schema, opts?: any);
    readonly symbols: string[];
    random(): EnumType;
  }

  class FixedType extends Type {
    constructor(schema: Schema, opts?: any);
    readonly size: number;
    random(): FixedType;
  }

  class FloatType extends Type {
    constructor();
    random(): FloatType;
  }

  class IntType extends Type {
    constructor();
    random(): IntType;
  }

  class LogicalType extends Type {
    constructor(schema: Schema, opts?: any);
    readonly underlyingType: Type;
    protected _export(schema: Schema): void;
    protected _fromValue(val: any): any;
    protected _resolve(type: Type): any;
    protected _toValue(any: any): any;
    random(): LogicalType;
  }

  class LongType extends Type {
    constructor();
    random(): LongType;
    static __with(methods: object, noUnpack?: boolean): LongType;
  }

  class MapType extends Type {
    constructor(schema: Schema, opts?: any);
    readonly valuesType: any;
    random(): MapType;
  }

  class NullType extends Type {  // TODO: Document this on the wiki
    constructor();
    random(): NullType;
  }

  class RecordType extends Type {
    constructor(schema: Schema, opts?: any);
    readonly fields: Field[];
    readonly recordConstructor: any;  // TODO: typeof Record once Record interface/class exists
    field(name: string): Field;
    random(): RecordType;
  }

  class Field {
    aliases: string[];
    defaultValue(): any;
    name: string;
    order: string;
    type: Type;
  }

  class StringType extends Type {  // TODO: Document this on the wiki
    constructor();
    random(): StringType;
  }

  class UnwrappedUnionType extends Type {
    constructor(schema: Schema, opts: any);
    random(): UnwrappedUnionType;
    readonly types: Type[];
  }

  class WrappedUnionType extends Type {
    constructor(schema: Schema, opts: any);
    random(): WrappedUnionType;
    readonly types: Type[];
  }
}
