import type { HttpRequest } from "./http";
import type { FinalizeHandler, FinalizeHandlerArguments, FinalizeHandlerOutput, HandlerExecutionContext } from "./middleware";
import type { MetadataBearer } from "./response";
/**
 * @public
 *
 * An event stream message. The headers and body properties will always be
 * defined, with empty headers represented as an object with no keys and an
 * empty body represented as a zero-length Uint8Array.
 */
export interface Message {
    headers: MessageHeaders;
    body: Uint8Array;
}
/**
 * @public
 */
export type MessageHeaders = Record<string, MessageHeaderValue>;
/**
 * @public
 */
export type HeaderValue<K extends string, V> = {
    type: K;
    value: V;
};
/**
 * @public
 */
export type BooleanHeaderValue = HeaderValue<"boolean", boolean>;
/**
 * @public
 */
export type ByteHeaderValue = HeaderValue<"byte", number>;
/**
 * @public
 */
export type ShortHeaderValue = HeaderValue<"short", number>;
/**
 * @public
 */
export type IntegerHeaderValue = HeaderValue<"integer", number>;
/**
 * @public
 */
export type LongHeaderValue = HeaderValue<"long", Int64>;
/**
 * @public
 */
export type BinaryHeaderValue = HeaderValue<"binary", Uint8Array>;
/**
 * @public
 */
export type StringHeaderValue = HeaderValue<"string", string>;
/**
 * @public
 */
export type TimestampHeaderValue = HeaderValue<"timestamp", Date>;
/**
 * @public
 */
export type UuidHeaderValue = HeaderValue<"uuid", string>;
/**
 * @public
 */
export type MessageHeaderValue = BooleanHeaderValue | ByteHeaderValue | ShortHeaderValue | IntegerHeaderValue | LongHeaderValue | BinaryHeaderValue | StringHeaderValue | TimestampHeaderValue | UuidHeaderValue;
/**
 * @public
 */
export interface Int64 {
    readonly bytes: Uint8Array;
    valueOf: () => number;
    toString: () => string;
}
/**
 * @public
 *
 * Util functions for serializing or deserializing event stream
 */
export interface EventStreamSerdeContext {
    eventStreamMarshaller: EventStreamMarshaller;
}
/**
 * @public
 *
 * A function which deserializes binary event stream message into modeled shape.
 */
export interface EventStreamMarshallerDeserFn<StreamType> {
    <T>(body: StreamType, deserializer: (input: Record<string, Message>) => Promise<T>): AsyncIterable<T>;
}
/**
 * @public
 *
 * A function that serializes modeled shape into binary stream message.
 */
export interface EventStreamMarshallerSerFn<StreamType> {
    <T>(input: AsyncIterable<T>, serializer: (event: T) => Message): StreamType;
}
/**
 * @public
 *
 * An interface which provides functions for serializing and deserializing binary event stream
 * to/from corresponsing modeled shape.
 */
export interface EventStreamMarshaller<StreamType = any> {
    deserialize: EventStreamMarshallerDeserFn<StreamType>;
    serialize: EventStreamMarshallerSerFn<StreamType>;
}
/**
 * @public
 */
export interface EventStreamRequestSigner {
    sign(request: HttpRequest): Promise<HttpRequest>;
}
/**
 * @public
 */
export interface EventStreamPayloadHandler {
    handle: <Input extends object, Output extends MetadataBearer>(next: FinalizeHandler<Input, Output>, args: FinalizeHandlerArguments<Input>, context?: HandlerExecutionContext) => Promise<FinalizeHandlerOutput<Output>>;
}
/**
 * @public
 */
export interface EventStreamPayloadHandlerProvider {
    (options: any): EventStreamPayloadHandler;
}
/**
 * @public
 */
export interface EventStreamSerdeProvider {
    (options: any): EventStreamMarshaller;
}
/**
 * @public
 */
export interface EventStreamSignerProvider {
    (options: any): EventStreamRequestSigner;
}
