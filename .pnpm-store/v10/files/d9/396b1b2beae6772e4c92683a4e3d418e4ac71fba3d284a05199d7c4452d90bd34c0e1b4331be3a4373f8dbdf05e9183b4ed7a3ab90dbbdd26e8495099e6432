import { BasePromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { LanguageModelLike } from "@langchain/core/language_models/base";
import { BaseOutputParser } from "@langchain/core/output_parsers";

//#region src/chains/combine_documents/stuff.d.ts

/**
 * Create a chain that passes a list of documents to a model.
 *
 * @param llm Language model to use for responding.
 * @param prompt Prompt template. Must contain input variable "context", which will be
    used for passing in the formatted documents.
 * @param outputParser Output parser. Defaults to `StringOutputParser`.
 * @param documentPrompt Prompt used for formatting each document into a string. Input
    variables can be "page_content" or any metadata keys that are in all documents.
    "page_content" will automatically retrieve the `Document.page_content`, and all
    other inputs variables will be automatically retrieved from the `Document.metadata` dictionary. Default to a prompt that only contains `Document.page_content`.
 * @param documentSeparator String separator to use between formatted document strings.
 * @returns An LCEL `Runnable` chain.
    Expects a dictionary as input with a list of `Document`s being passed under
    the "context" key.
    Return type depends on the `output_parser` used.
 */
declare function createStuffDocumentsChain<RunOutput = string>({
  llm,
  prompt,
  outputParser,
  documentPrompt,
  documentSeparator
}: {
  llm: LanguageModelLike;
  prompt: BasePromptTemplate;
  outputParser?: BaseOutputParser<RunOutput>;
  documentPrompt?: BasePromptTemplate;
  documentSeparator?: string;
}): Promise<RunnableSequence<Record<string, unknown>, Exclude<RunOutput, Error>>>;
//#endregion
export { createStuffDocumentsChain };
//# sourceMappingURL=stuff.d.ts.map