import { CodecSettings, Schema, SerdeFunctions, ShapeDeserializer } from "@smithy/types";
import { SerdeContext } from "../SerdeContext";
/**
 * This deserializer is a dispatcher that decides whether to use a string deserializer
 * or a codec deserializer based on HTTP traits.
 *
 * For example, in a JSON HTTP message, the deserialization of a field will differ depending on whether
 * it is bound to the HTTP header (string) or body (JSON).
 *
 * @public
 */
export declare class HttpInterceptingShapeDeserializer<CodecShapeDeserializer extends ShapeDeserializer<any>> extends SerdeContext implements ShapeDeserializer<string | Uint8Array> {
    private codecDeserializer;
    private stringDeserializer;
    constructor(codecDeserializer: CodecShapeDeserializer, codecSettings: CodecSettings);
    /**
     * @override
     */
    setSerdeContext(serdeContext: SerdeFunctions): void;
    read(schema: Schema, data: string | Uint8Array): any | Promise<any>;
}
