import type { Schema, ShapeSerializer } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import type { JsonSettings } from "./JsonCodec";
/**
 * @alpha
 */
export declare class JsonShapeSerializer extends SerdeContextConfig implements ShapeSerializer<string> {
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
    private _write;
}
