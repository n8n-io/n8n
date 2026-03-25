import type { CodecSettings, Schema, ShapeSerializer } from "@smithy/types";
import { SerdeContext } from "../SerdeContext";
/**
 * Serializes a shape to string.
 *
 * @public
 */
export declare class ToStringShapeSerializer extends SerdeContext implements ShapeSerializer<string> {
    private settings;
    private stringBuffer;
    constructor(settings: CodecSettings);
    write(schema: Schema, value: unknown): void;
    flush(): string;
}
