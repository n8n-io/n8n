import { DeserializeHandlerOptions, Endpoint, MetadataBearer, Pluggable, Provider, RequestSerializer, ResponseDeserializer, SerdeContext, SerdeFunctions, SerializeHandlerOptions, UrlParser } from "@smithy/types";
/**
 * @deprecated will be replaced by schemaSerdePlugin from core/schema.
 */
export declare const deserializerMiddlewareOption: DeserializeHandlerOptions;
/**
 * @deprecated will be replaced by schemaSerdePlugin from core/schema.
 */
export declare const serializerMiddlewareOption: SerializeHandlerOptions;
/**
 * Modifies the EndpointBearer to make it compatible with Endpoints 2.0 change.
 *
 * @internal
 * @deprecated
 */
export type V1OrV2Endpoint = {
    urlParser?: UrlParser;
    endpoint?: Provider<Endpoint>;
};
/**
 * @internal
 * @deprecated will be replaced by schemaSerdePlugin from core/schema.
 */
export declare function getSerdePlugin<InputType extends object = any, CommandSerdeContext extends SerdeContext = any, OutputType extends MetadataBearer = any>(config: SerdeFunctions, serializer: RequestSerializer<any, CommandSerdeContext>, deserializer: ResponseDeserializer<OutputType, any, CommandSerdeContext>): Pluggable<InputType, OutputType>;
