import { Document } from "@langchain/core/documents";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

//#region src/document_loaders/fs/chatgpt.d.ts
declare class ChatGPTLoader extends TextLoader {
  numLogs: number;
  constructor(filePathOrBlob: string | Blob, numLogs?: number);
  protected parse(raw: string): Promise<string[]>;
  load(): Promise<Document[]>;
}
//#endregion
export { ChatGPTLoader };
//# sourceMappingURL=chatgpt.d.ts.map