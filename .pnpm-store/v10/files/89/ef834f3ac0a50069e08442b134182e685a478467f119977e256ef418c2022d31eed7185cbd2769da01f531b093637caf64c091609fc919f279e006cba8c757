import { DocumentType, Schema, ShapeDeserializer } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { JsonSettings } from "./JsonCodec";
export declare class JsonShapeDeserializer
  extends SerdeContextConfig
  implements ShapeDeserializer<string>
{
  readonly settings: JsonSettings;
  constructor(settings: JsonSettings);
  read(schema: Schema, data: string | Uint8Array | unknown): Promise<any>;
  readObject(schema: Schema, data: DocumentType): any;
  protected _read(schema: Schema, value: unknown): any;
}
