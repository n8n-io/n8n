import { Document } from "../documents/document.cjs";
import { AsyncCallerParams } from "../utils/async_caller.cjs";
import { BaseDocumentLoader } from "./base.cjs";
import { KVMap } from "langsmith/schemas";
import { Client } from "langsmith";

//#region src/document_loaders/langsmith.d.ts
interface ClientConfig {
  apiUrl?: string;
  apiKey?: string;
  callerOptions?: AsyncCallerParams;
  timeout_ms?: number;
  webUrl?: string;
  anonymizer?: (values: KVMap) => KVMap;
  hideInputs?: boolean | ((inputs: KVMap) => KVMap);
  hideOutputs?: boolean | ((outputs: KVMap) => KVMap);
  autoBatchTracing?: boolean;
  pendingAutoBatchedRunLimit?: number;
  fetchOptions?: RequestInit;
}
interface LangSmithLoaderFields {
  datasetId?: string;
  datasetName?: string;
  exampleIds?: Array<string>;
  asOf?: Date | string;
  splits?: string[];
  inlineS3Urls?: boolean;
  offset?: number;
  limit?: number;
  metadata?: KVMap;
  filter?: string;
  contentKey?: string;
  formatContent?: (content: any) => string;
  client?: Client;
  clientConfig?: ClientConfig;
}
/**
 * Document loader integration with LangSmith.
 *
 * ## [Constructor args](https://api.js.langchain.com/interfaces/_langchain_core.document_loaders_langsmith.LangSmithLoaderFields.html)
 *
 * <details open>
 * <summary><strong>Load</strong></summary>
 *
 * ```typescript
 * import { LangSmithLoader } from '@langchain/core/document_loaders/langsmith';
 * import { Client } from 'langsmith';
 *
 * const langSmithClient = new Client({
 *   apiKey: process.env.LANGSMITH_API_KEY,
 * })
 *
 * const loader = new LangSmithLoader({
 *   datasetId: "9a3b36f7-b308-40a5-9b46-6613853b6330",
 *   limit: 1,
 * });
 *
 * const docs = await loader.load();
 * ```
 *
 * ```txt
 * [
 *   {
 *     pageContent: '{\n  "input_key_str": "string",\n  "input_key_bool": true\n}',
 *     metadata: {
 *       id: '8523d9e9-c123-4b23-9b46-21021nds289e',
 *       created_at: '2024-08-19T17:09:14.806441+00:00',
 *       modified_at: '2024-08-19T17:09:14.806441+00:00',
 *       name: '#8517 @ brace-test-dataset',
 *       dataset_id: '9a3b36f7-b308-40a5-9b46-6613853b6330',
 *       source_run_id: null,
 *       metadata: [Object],
 *       inputs: [Object],
 *       outputs: [Object]
 *     }
 *   }
 * ]
 * ```
 * </details>
 */
declare class LangSmithLoader extends BaseDocumentLoader {
  datasetId?: string;
  datasetName?: string;
  exampleIds?: Array<string>;
  asOf?: Date | string;
  splits?: string[];
  inlineS3Urls?: boolean;
  offset?: number;
  limit?: number;
  metadata?: KVMap;
  filter?: string;
  contentKey: string[];
  formatContent: (content: any) => string;
  client: Client;
  constructor(fields: LangSmithLoaderFields);
  load(): Promise<Document[]>;
}
//#endregion
export { LangSmithLoader, LangSmithLoaderFields };
//# sourceMappingURL=langsmith.d.cts.map