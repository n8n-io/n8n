import { Serializable } from "./load/serializable.cjs";
import { BaseMessage } from "./messages/base.cjs";
import { HumanMessage } from "./messages/human.cjs";
import { MessageStructure, MessageToolSet, MessageType } from "./messages/message.cjs";

//#region src/prompt_values.d.ts
interface BasePromptValueInterface extends Serializable {
  toString(): string;
  toChatMessages(): BaseMessage[];
}
interface StringPromptValueInterface extends BasePromptValueInterface {
  value: string;
}
interface ChatPromptValueInterface extends BasePromptValueInterface {
  messages: BaseMessage[];
}
/**
 * Base PromptValue class. All prompt values should extend this class.
 */
declare abstract class BasePromptValue extends Serializable implements BasePromptValueInterface {
  abstract toString(): string;
  abstract toChatMessages(): BaseMessage[];
}
/**
 * Represents a prompt value as a string. It extends the BasePromptValue
 * class and overrides the toString and toChatMessages methods.
 */
declare class StringPromptValue extends BasePromptValue implements StringPromptValueInterface {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  value: string;
  constructor(value: string);
  toString(): string;
  toChatMessages(): HumanMessage<MessageStructure<MessageToolSet>>[];
}
/**
 * Interface for the fields of a ChatPromptValue.
 */
interface ChatPromptValueFields {
  messages: BaseMessage[];
}
/**
 * Class that represents a chat prompt value. It extends the
 * BasePromptValue and includes an array of BaseMessage instances.
 */
declare class ChatPromptValue extends BasePromptValue implements ChatPromptValueInterface {
  lc_namespace: string[];
  lc_serializable: boolean;
  static lc_name(): string;
  messages: BaseMessage[];
  constructor(messages: BaseMessage[]);
  constructor(fields: ChatPromptValueFields);
  toString(): string;
  toChatMessages(): BaseMessage<MessageStructure<MessageToolSet>, MessageType>[];
}
type ImageContent = {
  /** Specifies the detail level of the image. */detail?: "auto" | "low" | "high"; /** Either a URL of the image or the base64 encoded image data. */
  url: string;
};
interface ImagePromptValueFields {
  imageUrl: ImageContent;
}
/**
 * Class that represents an image prompt value. It extends the
 * BasePromptValue and includes an ImageURL instance.
 */
declare class ImagePromptValue extends BasePromptValue {
  lc_namespace: string[];
  lc_serializable: boolean;
  static lc_name(): string;
  imageUrl: ImageContent;
  /** @ignore */
  value: string;
  constructor(fields: ImagePromptValueFields);
  constructor(fields: ImageContent);
  toString(): string;
  toChatMessages(): HumanMessage<MessageStructure<MessageToolSet>>[];
}
//#endregion
export { BasePromptValue, BasePromptValueInterface, ChatPromptValue, ChatPromptValueFields, ChatPromptValueInterface, ImageContent, ImagePromptValue, ImagePromptValueFields, StringPromptValue, StringPromptValueInterface };
//# sourceMappingURL=prompt_values.d.cts.map