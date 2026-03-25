import { InputValues } from "../utils/types/index.cjs";
import { RunnableConfig } from "../runnables/types.cjs";
import { Runnable, RunnableLike } from "../runnables/base.cjs";
import { ChatPromptValueInterface } from "../prompt_values.cjs";
import { BaseMessagePromptTemplateLike, ChatPromptTemplate, ChatPromptTemplateInput } from "./chat.cjs";

//#region src/prompts/structured.d.ts
/**
 * Interface for the input of a ChatPromptTemplate.
 */
interface StructuredPromptInput<RunInput extends InputValues = any, PartialVariableName extends string = any> extends ChatPromptTemplateInput<RunInput, PartialVariableName> {
  schema: Record<string, any>;
  method?: "jsonMode" | "jsonSchema" | "functionMode";
}
declare class StructuredPrompt<RunInput extends InputValues = any, PartialVariableName extends string = any> extends ChatPromptTemplate<RunInput, PartialVariableName> implements StructuredPromptInput<RunInput, PartialVariableName> {
  schema: Record<string, any>;
  method?: "jsonMode" | "jsonSchema" | "functionMode";
  lc_namespace: string[];
  get lc_aliases(): Record<string, string>;
  constructor(input: StructuredPromptInput<RunInput, PartialVariableName>);
  pipe<NewRunOutput>(coerceable: RunnableLike<ChatPromptValueInterface, NewRunOutput>): Runnable<RunInput, Exclude<NewRunOutput, Error>, RunnableConfig>;
  static fromMessagesAndSchema<RunInput extends InputValues = any>(promptMessages: (ChatPromptTemplate<InputValues, string> | BaseMessagePromptTemplateLike)[], schema: StructuredPromptInput["schema"], method?: "jsonMode" | "jsonSchema" | "functionMode"): ChatPromptTemplate<RunInput, any>;
}
//#endregion
export { StructuredPrompt, StructuredPromptInput };
//# sourceMappingURL=structured.d.cts.map