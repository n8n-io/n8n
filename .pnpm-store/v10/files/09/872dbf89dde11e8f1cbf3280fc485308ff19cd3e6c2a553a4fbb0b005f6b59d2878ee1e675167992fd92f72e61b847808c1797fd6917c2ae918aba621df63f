import { Codec, CodecSettings } from "@smithy/types";
import { SerdeContextConfig } from "../ConfigurableSerdeContext";
import { XmlShapeDeserializer } from "./XmlShapeDeserializer";
import { XmlShapeSerializer } from "./XmlShapeSerializer";
export type XmlSettings = CodecSettings & {
  xmlNamespace: string;
  serviceNamespace: string;
};
export declare class XmlCodec
  extends SerdeContextConfig
  implements Codec<Uint8Array | string, Uint8Array | string>
{
  readonly settings: XmlSettings;
  constructor(settings: XmlSettings);
  createSerializer(): XmlShapeSerializer;
  createDeserializer(): XmlShapeDeserializer;
}
