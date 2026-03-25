import { BaseChain } from "../chains/base.cjs";
import { TaggingChainOptions } from "../chains/openai_functions/tagging.cjs";
import { InteropZodObject } from "@langchain/core/utils/types";
import { ChatOpenAI } from "@langchain/openai";
import { Document, MappingDocumentTransformer } from "@langchain/core/documents";
import { JsonSchema7ObjectType } from "@langchain/core/utils/json_schema";

//#region src/document_transformers/openai_functions.d.ts

/**
 * A transformer that tags metadata to a document using a tagging chain.
 */
declare class MetadataTagger extends MappingDocumentTransformer {
  static lc_name(): string;
  protected taggingChain: BaseChain;
  constructor(fields: {
    taggingChain: BaseChain;
  });
  _transformDocument(document: Document): Promise<Document>;
}
declare function createMetadataTagger(schema: JsonSchema7ObjectType, options: TaggingChainOptions & {
  llm?: ChatOpenAI;
}): MetadataTagger;
declare function createMetadataTaggerFromZod(schema: InteropZodObject, options: TaggingChainOptions & {
  llm?: ChatOpenAI;
}): MetadataTagger;
//#endregion
export { MetadataTagger, createMetadataTagger, createMetadataTaggerFromZod };
//# sourceMappingURL=openai_functions.d.cts.map