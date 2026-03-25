import { WatsonxAuth, WatsonxRerankBasicOptions } from "../types/ibm.cjs";
import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import { TextRerankParams } from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { DocumentInterface } from "@langchain/core/documents";
import { BaseDocumentCompressor } from "@langchain/core/retrievers/document_compressors";

//#region src/document_compressors/ibm.d.ts
interface WatsonxInputRerank extends Omit<TextRerankParams, "modelId" | "inputs" | "query">, WatsonxRerankBasicOptions {
  model: string;
  truncateInputTokens?: number;
  returnOptions?: {
    topN?: number;
    inputs?: boolean;
  };
}
declare class WatsonxRerank extends BaseDocumentCompressor implements WatsonxInputRerank {
  maxRetries: number;
  version: string;
  truncateInputTokens?: number | undefined;
  returnOptions?: {
    topN?: number;
    inputs?: boolean;
    query?: boolean;
  } | undefined;
  model: string;
  spaceId?: string | undefined;
  projectId?: string | undefined;
  maxConcurrency?: number | undefined;
  serviceUrl: string;
  service: WatsonXAI;
  constructor(fields: WatsonxInputRerank & WatsonxAuth);
  scopeId(): {
    projectId: string;
    modelId: string;
    spaceId?: undefined;
  } | {
    projectId?: undefined;
    spaceId: string | undefined;
    modelId: string;
  };
  invocationParams(options?: Partial<WatsonxInputRerank>): {
    truncate_input_tokens: number | undefined;
    return_options: {
      top_n: number | undefined;
      inputs: boolean | undefined;
    };
  };
  compressDocuments(documents: DocumentInterface[], query: string): Promise<DocumentInterface[]>;
  rerank(documents: Array<DocumentInterface | string | Record<"pageContent", string>>, query: string, options?: Partial<WatsonxInputRerank>): Promise<Array<{
    index: number;
    relevanceScore: number;
    input?: string;
  }>>;
}
//#endregion
export { WatsonxInputRerank, WatsonxRerank };
//# sourceMappingURL=ibm.d.cts.map