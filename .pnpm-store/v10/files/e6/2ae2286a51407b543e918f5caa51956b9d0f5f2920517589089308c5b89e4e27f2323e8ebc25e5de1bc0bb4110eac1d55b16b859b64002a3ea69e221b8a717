import { MaskingTransformer } from "./transformer.cjs";
import { MaskingParserConfig } from "./types.cjs";

//#region src/experimental/masking/parser.d.ts

/**
 * MaskingParser class for handling the masking and rehydrating of messages.
 */
declare class MaskingParser {
  private transformers;
  private state;
  private config;
  constructor(config?: MaskingParserConfig);
  /**
   * Adds a transformer to the parser.
   * @param transformer - An instance of a class extending MaskingTransformer.
   */
  addTransformer(transformer: MaskingTransformer): void;
  /**
   * Getter method for retrieving the current state.
   * @returns The current state map.
   */
  getState(): Map<string, string>;
  /**
   * Masks the provided message using the added transformers.
   * This method sequentially applies each transformer's masking logic to the message.
   * It utilizes a state map to track original values corresponding to their masked versions.
   *
   * @param message - The message to be masked.
   * @returns A masked version of the message.
   * @throws {TypeError} If the message is not a string.
   * @throws {Error} If no transformers are added.
   */
  mask(message: string): Promise<string>;
  /**
   * Rehydrates a masked message back to its original form.
   * This method sequentially applies the rehydration logic of each added transformer in reverse order.
   * It relies on the state map to correctly map the masked values back to their original values.
   *
   * The rehydration process is essential for restoring the original content of a message
   * that has been transformed (masked) by the transformers. This process is the inverse of the masking process.
   *
   * @param message - The masked message to be rehydrated.
   * @returns The original (rehydrated) version of the message.
   */
  rehydrate(message: string, state?: Map<string, string>): Promise<string>;
}
//#endregion
export { MaskingParser };
//# sourceMappingURL=parser.d.cts.map