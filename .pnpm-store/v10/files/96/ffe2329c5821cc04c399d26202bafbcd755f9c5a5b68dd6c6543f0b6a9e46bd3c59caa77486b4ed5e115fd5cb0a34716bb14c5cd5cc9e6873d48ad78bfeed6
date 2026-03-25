import { EndpointV2 } from "../endpoint";
import { HandlerExecutionContext } from "../middleware";
import { MetadataBearer } from "../response";
import { EndpointBearer, SerdeFunctions } from "../serde";
import { BigDecimalSchema, BigIntegerSchema, BlobSchema, BooleanSchema, DocumentSchema, NumericSchema, StreamingBlobSchema, StringSchema, TimestampDateTimeSchema, TimestampDefaultSchema, TimestampEpochSecondsSchema, TimestampHttpDateSchema } from "./sentinels";
import { StaticSchema } from "./static-schemas";
import { TraitBitVector } from "./traits";
/**
 * A schema is an object or value that describes how to serialize/deserialize data.
 * @public
 */
export type $Schema = UnitSchema | SimpleSchema | $MemberSchema | StaticSchema | NormalizedSchema;
/**
 * Traits attached to schema objects.
 *
 * When this is a number, it refers to a pre-allocated
 * trait combination that is equivalent to one of the
 * object type's variations.
 *
 * @public
 */
export type SchemaTraits = TraitBitVector | SchemaTraitsObject;
/**
 * Simple schemas are those corresponding to simple Smithy types.
 * @see https://smithy.io/2.0/spec/simple-types.html
 * @public
 */
export type SimpleSchema = BlobSchemas | StringSchema | BooleanSchema | NumericSchema | BigIntegerSchema | BigDecimalSchema | DocumentSchema | TimestampSchemas | number;
/**
 * Sentinel value for Timestamp schema.
 * "Default" means unspecified and to use the protocol serializer's default format.
 *
 * @public
 */
export type TimestampSchemas = TimestampDefaultSchema | TimestampDateTimeSchema | TimestampHttpDateSchema | TimestampEpochSecondsSchema;
/**
 * Sentinel values for Blob schema.
 * @public
 */
export type BlobSchemas = BlobSchema | StreamingBlobSchema;
/**
 * Signal value for the Smithy void value. Typically used for
 * operation input and outputs.
 *
 * @public
 */
export type UnitSchema = "unit";
/**
 * See https://smithy.io/2.0/trait-index.html for individual definitions.
 *
 * @public
 */
export type SchemaTraitsObject = {
    idempotent?: 1;
    idempotencyToken?: 1;
    sensitive?: 1;
    sparse?: 1;
    /**
     * timestampFormat is expressed by the schema sentinel values of 4, 5, 6, and 7,
     * and not contained in trait objects.
     * @deprecated use schema value.
     */
    timestampFormat?: never;
    httpLabel?: 1;
    httpHeader?: string;
    httpQuery?: string;
    httpPrefixHeaders?: string;
    httpQueryParams?: 1;
    httpPayload?: 1;
    /**
     * [method, path, statusCode]
     */
    http?: [
        string,
        string,
        number
    ];
    httpResponseCode?: 1;
    /**
     * [hostPrefix]
     */
    endpoint?: [
        string
    ];
    xmlAttribute?: 1;
    xmlName?: string;
    /**
     * [prefix, uri]
     */
    xmlNamespace?: [
        string,
        string
    ];
    xmlFlattened?: 1;
    jsonName?: string;
    mediaType?: string;
    error?: "client" | "server";
    streaming?: 1;
    eventHeader?: 1;
    eventPayload?: 1;
    [traitName: string]: unknown;
};
/**
 * Indicates the schema is a member of a parent Structure schema.
 * It may also have a set of member traits distinct from its target shape's traits.
 * @public
 */
export type $MemberSchema = [
    $SchemaRef,
    SchemaTraits
];
/**
 * Schema for an operation.
 * @public
 */
export interface $OperationSchema {
    namespace: string;
    name: string;
    traits: SchemaTraits;
    input: $SchemaRef;
    output: $SchemaRef;
}
/**
 * Normalization wrapper for various schema data objects.
 * @public
 */
export interface NormalizedSchema {
    getSchema(): $Schema;
    getName(): string | undefined;
    isMemberSchema(): boolean;
    isListSchema(): boolean;
    isMapSchema(): boolean;
    isStructSchema(): boolean;
    isBlobSchema(): boolean;
    isTimestampSchema(): boolean;
    isStringSchema(): boolean;
    isBooleanSchema(): boolean;
    isNumericSchema(): boolean;
    isBigIntegerSchema(): boolean;
    isBigDecimalSchema(): boolean;
    isStreaming(): boolean;
    getMergedTraits(): SchemaTraitsObject;
    getMemberTraits(): SchemaTraitsObject;
    getOwnTraits(): SchemaTraitsObject;
    /**
     * For list/set/map.
     */
    getValueSchema(): NormalizedSchema;
    /**
     * For struct/union.
     */
    getMemberSchema(member: string): NormalizedSchema | undefined;
    structIterator(): Generator<[
        string,
        NormalizedSchema
    ], undefined, undefined>;
}
/**
 * A schema "reference" is either a schema or a function that
 * provides a schema. This is useful for lazy loading, and to allow
 * code generation to define schema out of dependency order.
 * @public
 */
export type $SchemaRef = $Schema | (() => $Schema);
/**
 * A codec creates serializers and deserializers for some format such as JSON, XML, or CBOR.
 *
 * @public
 */
export interface $Codec<S, D> extends ConfigurableSerdeContext {
    createSerializer(): $ShapeSerializer<S>;
    createDeserializer(): $ShapeDeserializer<D>;
}
/**
 * Configuration for codecs. Different protocols may share codecs, but require different behaviors from them.
 *
 * @public
 */
export type CodecSettings = {
    timestampFormat: {
        /**
         * Whether to use member timestamp format traits.
         */
        useTrait: boolean;
        /**
         * Default timestamp format.
         */
        default: TimestampDateTimeSchema | TimestampHttpDateSchema | TimestampEpochSecondsSchema;
    };
    /**
     * Whether to use HTTP binding traits.
     */
    httpBindings?: boolean;
};
/**
 * Turns a serialization into a data object.
 * @public
 */
export interface $ShapeDeserializer<SerializationType = Uint8Array> extends ConfigurableSerdeContext {
    /**
     * Optionally async.
     */
    read(schema: $Schema, data: SerializationType): any | Promise<any>;
}
/**
 * Turns a data object into a serialization.
 * @public
 */
export interface $ShapeSerializer<SerializationType = Uint8Array> extends ConfigurableSerdeContext {
    write(schema: $Schema, value: unknown): void;
    flush(): SerializationType;
}
/**
 * A client protocol defines how to convert a message (e.g. HTTP request/response) to and from a data object.
 * @public
 */
export interface $ClientProtocol<Request, Response> extends ConfigurableSerdeContext {
    /**
     * @returns the Smithy qualified shape id.
     */
    getShapeId(): string;
    getRequestType(): {
        new (...args: any[]): Request;
    };
    getResponseType(): {
        new (...args: any[]): Response;
    };
    /**
     * @returns the payload codec if the requests/responses have a symmetric format.
     * It otherwise may return null.
     */
    getPayloadCodec(): $Codec<any, any>;
    serializeRequest<Input extends object>(operationSchema: $OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<Request>;
    updateServiceEndpoint(request: Request, endpoint: EndpointV2): Request;
    deserializeResponse<Output extends MetadataBearer>(operationSchema: $OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: Response): Promise<Output>;
}
/**
 * Allows a protocol, codec, or serde utility to accept the serdeContext
 * from a client configuration or request/response handlerExecutionContext.
 *
 * @public
 */
export interface ConfigurableSerdeContext {
    setSerdeContext(serdeContext: SerdeFunctions): void;
}
