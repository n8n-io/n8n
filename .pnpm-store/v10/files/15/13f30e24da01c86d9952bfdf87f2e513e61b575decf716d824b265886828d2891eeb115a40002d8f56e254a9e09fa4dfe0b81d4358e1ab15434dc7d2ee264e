//#region src/memory.d.ts
/**
 * Type alias for a record where the keys are strings and the values can
 * be any type. This is used to represent the input values for a Chain.
 */
type InputValues = Record<string, any>;
/**
 * Type alias for a record where the keys are strings and the values can
 * be any type. This is used to represent the output values from a Chain.
 */
type OutputValues = Record<string, any>;
/**
 * Type alias for a record where the keys are strings and the values can
 * be any type. This is used to represent the memory variables in a Chain.
 */
type MemoryVariables = Record<string, any>;
/**
 * Abstract base class for memory in LangChain's Chains. Memory refers to
 * the state in Chains. It can be used to store information about past
 * executions of a Chain and inject that information into the inputs of
 * future executions of the Chain.
 */
declare abstract class BaseMemory {
  abstract get memoryKeys(): string[];
  /**
   * Abstract method that should take an object of input values and return a
   * Promise that resolves with an object of memory variables. The
   * implementation of this method should load the memory variables from the
   * provided input values.
   * @param values An object of input values.
   * @returns Promise that resolves with an object of memory variables.
   */
  abstract loadMemoryVariables(values: InputValues): Promise<MemoryVariables>;
  /**
   * Abstract method that should take two objects, one of input values and
   * one of output values, and return a Promise that resolves when the
   * context has been saved. The implementation of this method should save
   * the context based on the provided input and output values.
   * @param inputValues An object of input values.
   * @param outputValues An object of output values.
   * @returns Promise that resolves when the context has been saved.
   */
  abstract saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void>;
}
/**
 * This function is used by memory classes to select the input value
 * to use for the memory. If there is only one input value, it is used.
 * If there are multiple input values, the inputKey must be specified.
 */
declare const getInputValue: (inputValues: InputValues, inputKey?: string | undefined) => any;
/**
 * This function is used by memory classes to select the output value
 * to use for the memory. If there is only one output value, it is used.
 * If there are multiple output values, the outputKey must be specified.
 * If no outputKey is specified, an error is thrown.
 */
declare const getOutputValue: (outputValues: OutputValues, outputKey?: string | undefined) => any;
/**
 * Function used by memory classes to get the key of the prompt input,
 * excluding any keys that are memory variables or the "stop" key. If
 * there is not exactly one prompt input key, an error is thrown.
 */
declare function getPromptInputKey(inputs: Record<string, unknown>, memoryVariables: string[]): string;
//#endregion
export { BaseMemory, InputValues, MemoryVariables, OutputValues, getInputValue, getOutputValue, getPromptInputKey };
//# sourceMappingURL=memory.d.cts.map