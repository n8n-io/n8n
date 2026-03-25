import type { Schema, ShapeSerializer } from "@smithy/types";
import { SerdeContextConfig } from "../../ConfigurableSerdeContext";
import type { JsonSettings } from "../JsonCodec";
/**
 * This implementation uses single-pass JSON serialization with JS code instead of
 * JSON.stringify.
 *
 * It isn't significantly faster than dual-pass ending with native JSON.stringify
 * that I would want to use it. It seems to be barely faster in some mid-range object
 * sizes but slower on the high end.
 *
 * @internal
 */
export declare class SinglePassJsonShapeSerializer extends SerdeContextConfig implements ShapeSerializer<string> {
    readonly settings: JsonSettings;
    private buffer;
    private rootSchema;
    constructor(settings: JsonSettings);
    write(schema: Schema, value: unknown): void;
    /**
     * @internal
     */
    writeDiscriminatedDocument(schema: Schema, value: unknown): void;
    flush(): string;
    private writeObject;
    private writeValue;
}
