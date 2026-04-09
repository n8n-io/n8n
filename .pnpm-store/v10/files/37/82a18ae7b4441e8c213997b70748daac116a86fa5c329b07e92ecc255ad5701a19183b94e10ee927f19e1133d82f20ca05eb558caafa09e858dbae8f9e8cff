import { NormalizedSchema } from "@smithy/core/schema";
import type { Schema, ShapeSerializer } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import type { JsonSettings } from "./JsonCodec";
/**
 * @public
 */
export declare class JsonShapeSerializer extends SerdeContextConfig implements ShapeSerializer<string> {
    readonly settings: JsonSettings;
    /**
     * Write buffer. Reused per value serialization pass.
     * In the initial implementation, this is not an incremental buffer.
     */
    protected buffer: any;
    protected useReplacer: boolean;
    protected rootSchema: NormalizedSchema | undefined;
    constructor(settings: JsonSettings);
    write(schema: Schema, value: unknown): void;
    /**
     * @internal
     */
    writeDiscriminatedDocument(schema: Schema, value: unknown): void;
    flush(): string;
    /**
     * Order if-statements by order of likelihood.
     */
    protected _write(schema: Schema, value: unknown, container?: NormalizedSchema): any;
}
