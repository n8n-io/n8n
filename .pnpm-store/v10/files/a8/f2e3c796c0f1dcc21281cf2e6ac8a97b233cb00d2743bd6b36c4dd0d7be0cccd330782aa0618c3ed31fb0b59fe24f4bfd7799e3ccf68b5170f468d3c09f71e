import { CodecSettings, ConfigurableSerdeContext, Schema as ISchema, SerdeFunctions, ShapeSerializer } from "@smithy/types";
import { ToStringShapeSerializer } from "./ToStringShapeSerializer";
/**
 * This serializer decides whether to dispatch to a string serializer or a codec serializer
 * depending on HTTP binding traits within the given schema.
 *
 * For example, a JavaScript array is serialized differently when being written
 * to a REST JSON HTTP header (comma-delimited string) and a REST JSON HTTP body (JSON array).
 *
 * @public
 */
export declare class HttpInterceptingShapeSerializer<CodecShapeSerializer extends ShapeSerializer<string | Uint8Array>> implements ShapeSerializer<string | Uint8Array>, ConfigurableSerdeContext {
    private codecSerializer;
    private stringSerializer;
    private buffer;
    constructor(codecSerializer: CodecShapeSerializer, codecSettings: CodecSettings, stringSerializer?: ToStringShapeSerializer);
    /**
     * @override
     */
    setSerdeContext(serdeContext: SerdeFunctions): void;
    write(schema: ISchema, value: unknown): void;
    flush(): string | Uint8Array;
}
