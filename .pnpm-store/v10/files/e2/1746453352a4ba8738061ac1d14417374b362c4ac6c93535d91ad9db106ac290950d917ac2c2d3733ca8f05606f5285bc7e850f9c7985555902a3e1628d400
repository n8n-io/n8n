import { BaseMessage } from "../../messages/base.js";
import { BaseTracer, Run } from "../../tracers/base.js";
import { BaseChatMessageHistory, BaseListChatMessageHistory } from "../../chat_history.js";

//#region src/utils/testing/message_history.d.ts
declare class FakeChatMessageHistory extends BaseChatMessageHistory {
  lc_namespace: string[];
  messages: Array<BaseMessage>;
  constructor();
  getMessages(): Promise<BaseMessage[]>;
  addMessage(message: BaseMessage): Promise<void>;
  addUserMessage(message: string): Promise<void>;
  addAIMessage(message: string): Promise<void>;
  clear(): Promise<void>;
}
declare class FakeListChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  messages: Array<BaseMessage>;
  constructor();
  addMessage(message: BaseMessage): Promise<void>;
  getMessages(): Promise<BaseMessage[]>;
}
declare class FakeTracer extends BaseTracer {
  name: string;
  runs: Run[];
  constructor();
  protected persistRun(run: Run): Promise<void>;
}
//#endregion
export { FakeChatMessageHistory, FakeListChatMessageHistory, FakeTracer };
//# sourceMappingURL=message_history.d.ts.map