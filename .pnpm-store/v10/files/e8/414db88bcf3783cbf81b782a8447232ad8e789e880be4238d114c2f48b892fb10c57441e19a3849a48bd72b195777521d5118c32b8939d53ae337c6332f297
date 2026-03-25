import type { Schema, SerdeFunctions, ShapeDeserializer } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import type { XmlSettings } from "./XmlCodec";
/**
 * @public
 */
export declare class XmlShapeDeserializer extends SerdeContextConfig implements ShapeDeserializer<Uint8Array | string> {
    readonly settings: XmlSettings;
    private stringDeserializer;
    constructor(settings: XmlSettings);
    setSerdeContext(serdeContext: SerdeFunctions): void;
    /**
     * @param schema - describing the data.
     * @param bytes - serialized data.
     * @param key - used by AwsQuery to step one additional depth into the object before reading it.
     */
    read(schema: Schema, bytes: Uint8Array | string, key?: string): any;
    readSchema(_schema: Schema, value: any): any;
    protected parseXml(xml: string): any;
}
