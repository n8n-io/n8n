import { Tool } from "@langchain/core/tools";
import * as _langchain_core_load_serializable6 from "@langchain/core/load/serializable";

//#region src/tools/serper.d.ts

/**
 * Defines the parameters that can be passed to the Serper class during
 * instantiation. It includes `gl` and `hl` which are optional.
 */
type SerperParameters = {
  gl?: string;
  hl?: string;
};
/**
 * Wrapper around serper.
 *
 * You can create a free API key at https://serper.dev.
 *
 * To use, you should have the SERPER_API_KEY environment variable set.
 */
declare class Serper extends Tool {
  static lc_name(): string;
  /**
   * Converts the Serper instance to JSON. This method is not implemented
   * and will throw an error if called.
   * @returns Throws an error.
   */
  toJSON(): _langchain_core_load_serializable6.SerializedNotImplemented;
  protected key: string;
  protected params: Partial<SerperParameters>;
  constructor(apiKey?: string | undefined, params?: Partial<SerperParameters>);
  name: string;
  /** @ignore */
  _call(input: string): Promise<any>;
  description: string;
}
//#endregion
export { Serper, SerperParameters };
//# sourceMappingURL=serper.d.cts.map