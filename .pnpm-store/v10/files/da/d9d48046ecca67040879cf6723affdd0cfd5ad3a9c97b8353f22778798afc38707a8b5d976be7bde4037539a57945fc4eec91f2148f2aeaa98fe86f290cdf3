import { Codec, CodecSettings } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { JsonShapeDeserializer } from "./JsonShapeDeserializer";
import { JsonShapeSerializer } from "./JsonShapeSerializer";
export type JsonSettings = CodecSettings & {
  jsonName: boolean;
};
export declare class JsonCodec
  extends SerdeContextConfig
  implements Codec<string, string>
{
  readonly settings: JsonSettings;
  constructor(settings: JsonSettings);
  createSerializer(): JsonShapeSerializer;
  createDeserializer(): JsonShapeDeserializer;
}
