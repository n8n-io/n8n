import { BaseMessage } from "@langchain/core/messages";
import { ServerInfo } from "neo4j-driver";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/neo4j.d.ts
type Neo4jChatMessageHistoryConfigInput = {
  sessionId?: string | number;
  sessionNodeLabel?: string;
  messageNodeLabel?: string;
  url: string;
  username: string;
  password: string;
  windowSize?: number;
};
declare class Neo4jChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  sessionId: string | number;
  sessionNodeLabel: string;
  messageNodeLabel: string;
  windowSize: number;
  private driver;
  constructor({
    sessionId,
    sessionNodeLabel,
    messageNodeLabel,
    url,
    username,
    password,
    windowSize
  }: Neo4jChatMessageHistoryConfigInput);
  static initialize(props: Neo4jChatMessageHistoryConfigInput): Promise<Neo4jChatMessageHistory>;
  verifyConnectivity(): Promise<ServerInfo>;
  getMessages(): Promise<BaseMessage[]>;
  addMessage(message: BaseMessage): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
}
//#endregion
export { Neo4jChatMessageHistory, Neo4jChatMessageHistoryConfigInput };
//# sourceMappingURL=neo4j.d.ts.map