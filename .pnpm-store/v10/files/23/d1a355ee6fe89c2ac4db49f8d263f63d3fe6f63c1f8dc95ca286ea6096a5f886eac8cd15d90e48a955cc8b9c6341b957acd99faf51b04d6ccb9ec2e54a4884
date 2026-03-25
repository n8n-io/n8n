import { Document } from "../../documents/document.cjs";
import { BaseRetriever } from "../../retrievers/index.cjs";

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
//# sourceMappingURL=retrievers.d.cts.map