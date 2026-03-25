import { Schema as ISchema, ShapeSerializer } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { XmlSettings } from "./XmlCodec";
export declare class XmlShapeSerializer
  extends SerdeContextConfig
  implements ShapeSerializer<string | Uint8Array>
{
  readonly settings: XmlSettings;
  private stringBuffer?;
  private byteBuffer?;
  private buffer?;
  constructor(settings: XmlSettings);
  write(schema: ISchema, value: unknown): void;
  flush(): string | Uint8Array;
  private writeStruct;
  private writeList;
  private writeMap;
  private writeSimple;
  private writeSimpleInto;
  private getXmlnsAttribute;
}
