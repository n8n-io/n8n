import type { Codec, CodecSettings } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { JsonShapeDeserializer } from "./JsonShapeDeserializer";
import { JsonShapeSerializer } from "./JsonShapeSerializer";
/**
 * @alpha
 */
export type JsonSettings = CodecSettings & {
    jsonName: boolean;
};
/**
 * @public
 */
export declare class JsonCodec extends SerdeContextConfig implements Codec<string, string> {
    readonly settings: JsonSettings;
    constructor(settings: JsonSettings);
    createSerializer(): JsonShapeSerializer;
    createDeserializer(): JsonShapeDeserializer;
}
