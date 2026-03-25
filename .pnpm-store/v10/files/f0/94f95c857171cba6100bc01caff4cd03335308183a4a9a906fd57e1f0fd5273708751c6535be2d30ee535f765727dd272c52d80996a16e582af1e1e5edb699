import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader, DocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/recursive_url.d.ts
interface RecursiveUrlLoaderOptions {
  excludeDirs?: string[];
  extractor?: (text: string) => string;
  maxDepth?: number;
  timeout?: number;
  preventOutside?: boolean;
  callerOptions?: ConstructorParameters<typeof AsyncCaller>[0];
}
declare class RecursiveUrlLoader extends BaseDocumentLoader implements DocumentLoader {
  private caller;
  private url;
  private excludeDirs;
  private extractor;
  private maxDepth;
  private timeout;
  private preventOutside;
  constructor(url: string, options: RecursiveUrlLoaderOptions);
  private fetchWithTimeout;
  private getChildLinks;
  private extractMetadata;
  private getUrlAsDoc;
  private getChildUrlsRecursive;
  load(): Promise<Document[]>;
}
//#endregion
export { RecursiveUrlLoader, RecursiveUrlLoaderOptions };
//# sourceMappingURL=recursive_url.d.ts.map