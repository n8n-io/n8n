import { Schema, SerdeFunctions, ShapeDeserializer } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { XmlSettings } from "./XmlCodec";
export declare class XmlShapeDeserializer
  extends SerdeContextConfig
  implements ShapeDeserializer<Uint8Array | string>
{
  readonly settings: XmlSettings;
  private stringDeserializer;
  constructor(settings: XmlSettings);
  setSerdeContext(serdeContext: SerdeFunctions): void;
  read(schema: Schema, bytes: Uint8Array | string, key?: string): any;
  readSchema(_schema: Schema, value: any): any;
  protected parseXml(xml: string): any;
}
