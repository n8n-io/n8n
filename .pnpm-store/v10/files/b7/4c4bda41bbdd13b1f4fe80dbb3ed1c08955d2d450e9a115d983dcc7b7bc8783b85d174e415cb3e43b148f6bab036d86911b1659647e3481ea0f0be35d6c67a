import { Serializable } from "./load/serializable.cjs";
import { BaseMessage } from "./messages/base.cjs";

//#region src/chat_history.d.ts
/**
 * Base class for all chat message histories. All chat message histories
 * should extend this class.
 */
declare abstract class BaseChatMessageHistory extends Serializable {
  abstract getMessages(): Promise<BaseMessage[]>;
  abstract addMessage(message: BaseMessage): Promise<void>;
  abstract addUserMessage(message: string): Promise<void>;
  abstract addAIMessage(message: string): Promise<void>;
  /**
   * Add a list of messages.
   *
   * Implementations should override this method to handle bulk addition of messages
   * in an efficient manner to avoid unnecessary round-trips to the underlying store.
   *
   * @param messages - A list of BaseMessage objects to store.
   */
  addMessages(messages: BaseMessage[]): Promise<void>;
  abstract clear(): Promise<void>;
}
/**
 * Base class for all list chat message histories. All list chat message
 * histories should extend this class.
 */
declare abstract class BaseListChatMessageHistory extends Serializable {
  /** Returns a list of messages stored in the store. */
  abstract getMessages(): Promise<BaseMessage[]>;
  /**
   * Add a message object to the store.
   */
  abstract addMessage(message: BaseMessage): Promise<void>;
  /**
   * This is a convenience method for adding a human message string to the store.
   * Please note that this is a convenience method. Code should favor the
   * bulk addMessages interface instead to save on round-trips to the underlying
   * persistence layer.
   * This method may be deprecated in a future release.
   */
  addUserMessage(message: string): Promise<void>;
  /**
   * This is a convenience method for adding an AI message string to the store.
   * Please note that this is a convenience method. Code should favor the bulk
   * addMessages interface instead to save on round-trips to the underlying
   * persistence layer.
   * This method may be deprecated in a future release.
   */
  addAIMessage(message: string): Promise<void>;
  /**
   * Add a list of messages.
   *
   * Implementations should override this method to handle bulk addition of messages
   * in an efficient manner to avoid unnecessary round-trips to the underlying store.
   *
   * @param messages - A list of BaseMessage objects to store.
   */
  addMessages(messages: BaseMessage[]): Promise<void>;
  /**
   * Remove all messages from the store.
   */
  clear(): Promise<void>;
}
/**
 * Class for storing chat message history in-memory. It extends the
 * BaseListChatMessageHistory class and provides methods to get, add, and
 * clear messages.
 */
declare class InMemoryChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  private messages;
  constructor(messages?: BaseMessage[]);
  /**
   * Method to get all the messages stored in the ChatMessageHistory
   * instance.
   * @returns Array of stored BaseMessage instances.
   */
  getMessages(): Promise<BaseMessage[]>;
  /**
   * Method to add a new message to the ChatMessageHistory instance.
   * @param message The BaseMessage instance to add.
   * @returns A promise that resolves when the message has been added.
   */
  addMessage(message: BaseMessage): Promise<void>;
  /**
   * Method to clear all the messages from the ChatMessageHistory instance.
   * @returns A promise that resolves when all messages have been cleared.
   */
  clear(): Promise<void>;
}
//#endregion
export { BaseChatMessageHistory, BaseListChatMessageHistory, InMemoryChatMessageHistory };
//# sourceMappingURL=chat_history.d.cts.map