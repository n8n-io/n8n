import { BaseMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { AttributeValue, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";

//#region src/stores/message/dynamodb.d.ts

/**
 * Interface defining the fields required to create an instance of
 * `DynamoDBChatMessageHistory`. It includes the DynamoDB table name,
 * session ID, partition key, sort key, message attribute name, and
 * DynamoDB client configuration.
 */
interface DynamoDBChatMessageHistoryFields {
  tableName: string;
  sessionId: string;
  partitionKey?: string;
  sortKey?: string;
  messageAttributeName?: string;
  config?: DynamoDBClientConfig;
  key?: Record<string, AttributeValue>;
}
/**
 * Class providing methods to interact with a DynamoDB table to store and
 * retrieve chat messages. It extends the `BaseListChatMessageHistory`
 * class.
 */
declare class DynamoDBChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  private tableName;
  private sessionId;
  private client;
  private partitionKey;
  private sortKey?;
  private messageAttributeName;
  private dynamoKey;
  /**
   * Transforms a `StoredMessage` into a `DynamoDBSerializedChatMessage`.
   * The `DynamoDBSerializedChatMessage` format is suitable for storing in DynamoDB.
   *
   * @param message - The `StoredMessage` to be transformed.
   * @returns The transformed `DynamoDBSerializedChatMessage`.
   */
  private createDynamoDBSerializedChatMessage;
  constructor({
    tableName,
    sessionId,
    partitionKey,
    sortKey,
    messageAttributeName,
    config,
    key
  }: DynamoDBChatMessageHistoryFields);
  /**
   * Retrieves all messages from the DynamoDB table and returns them as an
   * array of `BaseMessage` instances.
   * @returns Array of stored messages
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Adds a new message to the DynamoDB table.
   * @param message The message to be added to the DynamoDB table.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Adds new messages to the DynamoDB table.
   * @param messages The messages to be added to the DynamoDB table.
   */
  addMessages(messages: BaseMessage[]): Promise<void>;
  /**
   * Deletes all messages from the DynamoDB table.
   */
  clear(): Promise<void>;
}
//#endregion
export { DynamoDBChatMessageHistory, DynamoDBChatMessageHistoryFields };
//# sourceMappingURL=dynamodb.d.ts.map