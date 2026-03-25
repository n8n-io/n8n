import { BaseMessage } from "../messages/base.js";
import { ChatGeneration, Generation } from "../outputs.js";
import { BaseCallbackConfig } from "../callbacks/manager.js";
import { BaseOutputParser } from "./base.js";

//#region src/output_parsers/transform.d.ts
/**
 * Class to parse the output of an LLM call that also allows streaming inputs.
 */
declare abstract class BaseTransformOutputParser<T = unknown> extends BaseOutputParser<T> {
  _transform(inputGenerator: AsyncGenerator<string | BaseMessage>): AsyncGenerator<T>;
  /**
   * Transforms an asynchronous generator of input into an asynchronous
   * generator of parsed output.
   * @param inputGenerator An asynchronous generator of input.
   * @param options A configuration object.
   * @returns An asynchronous generator of parsed output.
   */
  transform(inputGenerator: AsyncGenerator<string | BaseMessage>, options: BaseCallbackConfig): AsyncGenerator<T>;
}
type BaseCumulativeTransformOutputParserInput = {
  diff?: boolean;
};
/**
 * A base class for output parsers that can handle streaming input. It
 * extends the `BaseTransformOutputParser` class and provides a method for
 * converting parsed outputs into a diff format.
 */
declare abstract class BaseCumulativeTransformOutputParser<T = unknown> extends BaseTransformOutputParser<T> {
  protected diff: boolean;
  constructor(fields?: BaseCumulativeTransformOutputParserInput);
  protected abstract _diff(prev: any | undefined, next: any): any;
  abstract parsePartialResult(generations: Generation[] | ChatGeneration[]): Promise<T | undefined>;
  _transform(inputGenerator: AsyncGenerator<string | BaseMessage>): AsyncGenerator<T>;
  getFormatInstructions(): string;
}
//#endregion
export { BaseCumulativeTransformOutputParser, BaseCumulativeTransformOutputParserInput, BaseTransformOutputParser };
//# sourceMappingURL=transform.d.ts.map