import { Document } from "../../documents/document.js";
import { BaseRetriever } from "../../retrievers/index.js";

//#region src/utils/testing/retrievers.d.ts
declare class FakeRetriever extends BaseRetriever {
  lc_namespace: string[];
  output: Document<Record<string, any>>[];
  constructor(fields?: {
    output: Document[];
  });
  _getRelevantDocuments(_query: string): Promise<Document<Record<string, any>>[]>;
}
//#endregion
export { FakeRetriever };
//# sourceMappingURL=retrievers.d.ts.map