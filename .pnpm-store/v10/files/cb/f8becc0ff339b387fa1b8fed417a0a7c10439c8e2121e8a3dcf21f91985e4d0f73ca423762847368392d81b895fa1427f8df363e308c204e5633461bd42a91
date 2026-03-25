import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { Datastore } from "interface-datastore";

//#region src/stores/message/ipfs_datastore.d.ts
interface IPFSDatastoreChatMessageHistoryInput {
  sessionId: string;
}
interface IPFSDatastoreChatMessageHistoryProps {
  datastore: Datastore;
  sessionId: string;
}
declare class IPFSDatastoreChatMessageHistory extends BaseListChatMessageHistory {
  readonly lc_namespace: string[];
  readonly sessionId: string;
  private readonly datastore;
  constructor({
    datastore,
    sessionId
  }: IPFSDatastoreChatMessageHistoryProps);
  getMessages(): Promise<BaseMessage[]>;
  addMessage(message: BaseMessage): Promise<void>;
  addMessages(messages: BaseMessage[]): Promise<void>;
  clear(): Promise<void>;
}
//#endregion
export { IPFSDatastoreChatMessageHistory, IPFSDatastoreChatMessageHistoryInput, IPFSDatastoreChatMessageHistoryProps };
//# sourceMappingURL=ipfs_datastore.d.ts.map