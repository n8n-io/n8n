import { BaseChatMemory, BaseChatMemoryInput } from "./chat_memory.js";
import { BaseMemory, InputValues, MemoryVariables, OutputValues } from "@langchain/core/memory";

//#region src/memory/combined_memory.d.ts

/**
 * Interface that defines the shape of the input object that the
 * CombinedMemory constructor accepts. It extends the BaseChatMemoryInput
 * interface and adds additional properties.
 */
interface CombinedMemoryInput extends BaseChatMemoryInput {
  memories: BaseMemory[];
  humanPrefix?: string;
  aiPrefix?: string;
  memoryKey?: string;
}
/**
 * Class that manages and manipulates previous chat messages. It extends
 * from the BaseChatMemory class and implements the CombinedMemoryInput
 * interface.
 */
declare class CombinedMemory extends BaseChatMemory implements CombinedMemoryInput {
  humanPrefix: string;
  aiPrefix: string;
  memoryKey: string;
  memories: BaseMemory[];
  constructor(fields?: CombinedMemoryInput);
  /**
   * Checks for repeated memory variables across all memory objects. Throws
   * an error if any are found.
   */
  checkRepeatedMemoryVariable(): void;
  /**
   * Checks if input keys are set for all memory objects. Logs a warning if
   * any are missing.
   */
  checkInputKey(): void;
  /**
   * Loads memory variables from all memory objects.
   * @param inputValues Input values to load memory variables from.
   * @returns Promise that resolves with an object containing the loaded memory variables.
   */
  loadMemoryVariables(inputValues: InputValues): Promise<MemoryVariables>;
  /**
   * Saves the context to all memory objects.
   * @param inputValues Input values to save.
   * @param outputValues Output values to save.
   * @returns Promise that resolves when the context has been saved to all memory objects.
   */
  saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void>;
  /**
   * Clears all memory objects.
   * @returns Promise that resolves when all memory objects have been cleared.
   */
  clear(): Promise<void>;
  get memoryKeys(): string[];
}
//#endregion
export { CombinedMemory, CombinedMemoryInput };
//# sourceMappingURL=combined_memory.d.ts.map