import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader, DocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/html.d.ts

/**
 * Represents the parameters for configuring WebBaseLoaders. It extends the
 * AsyncCallerParams interface and adds additional parameters specific to
 * web-based loaders.
 */
interface WebBaseLoaderParams extends AsyncCallerParams {
  /**
   * The timeout in milliseconds for the fetch request. Defaults to 10s.
   */
  timeout?: number;
  /**
   * The text decoder to use to decode the response. Defaults to UTF-8.
   */
  textDecoder?: TextDecoder;
  /**
   * The headers to use in the fetch request.
   */
  headers?: HeadersInit;
}
interface WebBaseLoader extends DocumentLoader {
  timeout: number;
  caller: AsyncCaller;
  textDecoder?: TextDecoder;
  headers?: HeadersInit;
}
declare class HTMLWebBaseLoader extends BaseDocumentLoader implements WebBaseLoader {
  webPath: string;
  timeout: number;
  caller: AsyncCaller;
  textDecoder?: TextDecoder;
  headers?: HeadersInit;
  constructor(webPath: string, fields?: WebBaseLoaderParams);
  load(): Promise<Document[]>;
}
//#endregion
export { HTMLWebBaseLoader, WebBaseLoader, WebBaseLoaderParams };
//# sourceMappingURL=html.d.cts.map