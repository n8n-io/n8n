import { BaseMessage } from "@langchain/core/messages";
import { DocumentByName, FieldPaths, FunctionReference, GenericActionCtx, GenericDataModel, IndexNames, NamedTableInfo, TableNamesInDataModel } from "convex/server";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/convex.d.ts

/**
 * Type that defines the config required to initialize the
 * ConvexChatMessageHistory class. At minimum it needs a sessionId
 * and an ActionCtx.
 */
type ConvexChatMessageHistoryInput<DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel> = "messages", IndexName extends IndexNames<NamedTableInfo<DataModel, TableName>> = "bySessionId", SessionIdFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>> = "sessionId", MessageTextFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>> = "message", InsertMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  document: object;
}> = any, LookupQuery extends FunctionReference<"query", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}, object[]> = any, DeleteManyMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}> = any> = {
  readonly ctx: GenericActionCtx<DataModel>;
  readonly sessionId: DocumentByName<DataModel, TableName>[SessionIdFieldName];
  /**
   * Defaults to "messages"
   */
  readonly table?: TableName;
  /**
   * Defaults to "bySessionId"
   */
  readonly index?: IndexName;
  /**
   * Defaults to "sessionId"
   */
  readonly sessionIdField?: SessionIdFieldName;
  /**
   * Defaults to "message"
   */
  readonly messageTextFieldName?: MessageTextFieldName;
  /**
   * Defaults to `internal.langchain.db.insert`
   */
  readonly insert?: InsertMutation;
  /**
   * Defaults to `internal.langchain.db.lookup`
   */
  readonly lookup?: LookupQuery;
  /**
   * Defaults to `internal.langchain.db.deleteMany`
   */
  readonly deleteMany?: DeleteManyMutation;
};
declare class ConvexChatMessageHistory<DataModel extends GenericDataModel, SessionIdFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>> = "sessionId", TableName extends TableNamesInDataModel<DataModel> = "messages", IndexName extends IndexNames<NamedTableInfo<DataModel, TableName>> = "bySessionId", MessageTextFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>> = "message", InsertMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  document: object;
}> = any, LookupQuery extends FunctionReference<"query", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}, object[]> = any, DeleteManyMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}> = any> extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private readonly ctx;
  private readonly sessionId;
  private readonly table;
  private readonly index;
  private readonly sessionIdField;
  private readonly messageTextFieldName;
  private readonly insert;
  private readonly lookup;
  private readonly deleteMany;
  constructor(config: ConvexChatMessageHistoryInput<DataModel, TableName, IndexName, SessionIdFieldName, MessageTextFieldName, InsertMutation, LookupQuery, DeleteManyMutation>);
  getMessages(): Promise<BaseMessage[]>;
  addMessage(message: BaseMessage): Promise<void>;
  clear(): Promise<void>;
}
//#endregion
export { ConvexChatMessageHistory, ConvexChatMessageHistoryInput };
//# sourceMappingURL=convex.d.cts.map