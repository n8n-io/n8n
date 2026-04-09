import type { Schema, ShapeSerializer } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import type { QuerySerializerSettings } from "./QuerySerializerSettings";
/**
 * @public
 */
export declare class QueryShapeSerializer extends SerdeContextConfig implements ShapeSerializer<string | Uint8Array> {
    readonly settings: QuerySerializerSettings;
    private buffer;
    constructor(settings: QuerySerializerSettings);
    write(schema: Schema, value: unknown, prefix?: string): void;
    flush(): string | Uint8Array;
    protected getKey(memberName: string, xmlName?: string, ec2QueryName?: unknown, keySource?: string): string;
    protected writeKey(key: string): void;
    protected writeValue(value: string): void;
}
