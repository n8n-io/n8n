import type { CodecSettings, Schema, ShapeDeserializer } from "@smithy/types";
import { SerdeContext } from "../SerdeContext";
/**
 * This deserializer reads strings.
 *
 * @public
 */
export declare class FromStringShapeDeserializer extends SerdeContext implements ShapeDeserializer<string> {
    private settings;
    constructor(settings: CodecSettings);
    read(_schema: Schema, data: string): any;
    private base64ToUtf8;
}
