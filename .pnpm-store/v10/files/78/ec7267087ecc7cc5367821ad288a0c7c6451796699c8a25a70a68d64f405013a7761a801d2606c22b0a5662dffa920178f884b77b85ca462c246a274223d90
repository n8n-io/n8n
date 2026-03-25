import { BaseTransformOutputParser } from "./transform.cjs";

//#region src/output_parsers/bytes.d.ts
/**
 * OutputParser that parses LLMResult into the top likely string and
 * encodes it into bytes.
 */
declare class BytesOutputParser extends BaseTransformOutputParser<Uint8Array> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  protected textEncoder: InstanceType<typeof TextEncoder>;
  parse(text: string): Promise<Uint8Array>;
  getFormatInstructions(): string;
}
//#endregion
export { BytesOutputParser };
//# sourceMappingURL=bytes.d.cts.map