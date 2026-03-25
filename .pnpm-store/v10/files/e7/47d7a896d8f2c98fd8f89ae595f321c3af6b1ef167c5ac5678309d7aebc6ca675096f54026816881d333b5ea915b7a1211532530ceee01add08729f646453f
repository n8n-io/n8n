import { BaseMessage, BaseMessageLike, MessageContent } from "../messages/base.cjs";
import { AIMessage } from "../messages/ai.cjs";
import { ChatMessage } from "../messages/chat.cjs";
import { HumanMessage } from "../messages/human.cjs";
import { SystemMessage } from "../messages/system.cjs";
import { MessageStructure, MessageToolSet, MessageType } from "../messages/message.cjs";
import { InputValues, PartialValues } from "../utils/types/index.cjs";
import { BaseCallbackConfig } from "../callbacks/manager.cjs";
import { Runnable } from "../runnables/base.cjs";
import { ChatPromptValueInterface } from "../prompt_values.cjs";
import { BasePromptTemplate, BasePromptTemplateInput, TypedPromptInputValues } from "./base.cjs";
import { BaseStringPromptTemplate } from "./string.cjs";
import { TemplateFormat } from "./template.cjs";
import { ExtractedFStringParams, PromptTemplateInput } from "./prompt.cjs";
import { ImagePromptTemplate } from "./image.cjs";
import { DictPromptTemplate } from "./dict.cjs";

//#region src/prompts/chat.d.ts
/**
 * Abstract class that serves as a base for creating message prompt
 * templates. It defines how to format messages for different roles in a
 * conversation.
 */
declare abstract class BaseMessagePromptTemplate<RunInput extends InputValues = any, RunOutput extends BaseMessage[] = BaseMessage[]> extends Runnable<RunInput, RunOutput> {
  lc_namespace: string[];
  lc_serializable: boolean;
  abstract inputVariables: Array<Extract<keyof RunInput, string>>;
  /**
   * Method that takes an object of TypedPromptInputValues and returns a
   * promise that resolves to an array of BaseMessage instances.
   * @param values Object of TypedPromptInputValues
   * @returns Formatted array of BaseMessages
   */
  abstract formatMessages(values: TypedPromptInputValues<RunInput>): Promise<RunOutput>;
  /**
   * Calls the formatMessages method with the provided input and options.
   * @param input Input for the formatMessages method
   * @param options Optional BaseCallbackConfig
   * @returns Formatted output messages
   */
  invoke(input: RunInput, options?: BaseCallbackConfig): Promise<RunOutput>;
}
/**
 * Interface for the fields of a MessagePlaceholder.
 */
interface MessagesPlaceholderFields<T extends string> {
  variableName: T;
  optional?: boolean;
}
/**
 * Class that represents a placeholder for messages in a chat prompt. It
 * extends the BaseMessagePromptTemplate.
 */
declare class MessagesPlaceholder<RunInput extends InputValues = any> extends BaseMessagePromptTemplate<RunInput> implements MessagesPlaceholderFields<Extract<keyof RunInput, string>> {
  static lc_name(): string;
  variableName: Extract<keyof RunInput, string>;
  optional: boolean;
  constructor(variableName: Extract<keyof RunInput, string>);
  constructor(fields: MessagesPlaceholderFields<Extract<keyof RunInput, string>>);
  get inputVariables(): Extract<keyof RunInput, string>[];
  formatMessages(values: TypedPromptInputValues<RunInput>): Promise<BaseMessage[]>;
}
/**
 * Interface for the fields of a MessageStringPromptTemplate.
 */
interface MessageStringPromptTemplateFields<T extends InputValues = any> {
  prompt: BaseStringPromptTemplate<T, string>;
}
/**
 * Abstract class that serves as a base for creating message string prompt
 * templates. It extends the BaseMessagePromptTemplate.
 */
declare abstract class BaseMessageStringPromptTemplate<RunInput extends InputValues = any> extends BaseMessagePromptTemplate<RunInput> {
  prompt: BaseStringPromptTemplate<InputValues<Extract<keyof RunInput, string>>, string>;
  constructor(prompt: BaseStringPromptTemplate<InputValues<Extract<keyof RunInput, string>>>);
  constructor(fields: MessageStringPromptTemplateFields<InputValues<Extract<keyof RunInput, string>>>);
  get inputVariables(): Extract<Extract<keyof RunInput, string>, string>[];
  abstract format(values: TypedPromptInputValues<RunInput>): Promise<BaseMessage>;
  formatMessages(values: TypedPromptInputValues<RunInput>): Promise<BaseMessage[]>;
}
/**
 * Abstract class that serves as a base for creating chat prompt
 * templates. It extends the BasePromptTemplate.
 */
declare abstract class BaseChatPromptTemplate<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BasePromptTemplate<RunInput, ChatPromptValueInterface, PartialVariableName> {
  constructor(input: BasePromptTemplateInput<RunInput, PartialVariableName>);
  abstract formatMessages(values: TypedPromptInputValues<RunInput>): Promise<BaseMessage[]>;
  format(values: TypedPromptInputValues<RunInput>): Promise<string>;
  formatPromptValue(values: TypedPromptInputValues<RunInput>): Promise<ChatPromptValueInterface>;
}
/**
 * Interface for the fields of a ChatMessagePromptTemplate.
 */
interface ChatMessagePromptTemplateFields<T extends InputValues = any> extends MessageStringPromptTemplateFields<T> {
  role: string;
}
/**
 * Class that represents a chat message prompt template. It extends the
 * BaseMessageStringPromptTemplate.
 */
declare class ChatMessagePromptTemplate<RunInput extends InputValues = any> extends BaseMessageStringPromptTemplate<RunInput> {
  static lc_name(): string;
  role: string;
  constructor(prompt: BaseStringPromptTemplate<InputValues<Extract<keyof RunInput, string>>>, role: string);
  constructor(fields: ChatMessagePromptTemplateFields<InputValues<Extract<keyof RunInput, string>>>);
  format(values: RunInput): Promise<BaseMessage>;
  static fromTemplate<RunInput extends InputValues = Symbol, T extends string = string>(template: T, role: string, options?: {
    templateFormat?: TemplateFormat;
  }): ChatMessagePromptTemplate<ExtractedFStringParams<T, RunInput>>;
}
interface _TextTemplateParam {
  text?: string | Record<string, any>;
}
interface _ImageTemplateParam {
  image_url?: string | Record<string, any>;
}
type MessageClass = typeof HumanMessage | typeof AIMessage | typeof SystemMessage;
type ChatMessageClass = typeof ChatMessage;
interface _StringImageMessagePromptTemplateOptions<Format extends TemplateFormat = TemplateFormat> extends Record<string, unknown> {
  templateFormat?: Format;
}
declare class _StringImageMessagePromptTemplate<RunInput extends InputValues = any, RunOutput extends BaseMessage[] = BaseMessage[]> extends BaseMessagePromptTemplate<RunInput, RunOutput> {
  lc_namespace: string[];
  lc_serializable: boolean;
  inputVariables: Array<Extract<keyof RunInput, string>>;
  additionalOptions: _StringImageMessagePromptTemplateOptions;
  prompt: BaseStringPromptTemplate<InputValues<Extract<keyof RunInput, string>>, string> | Array<BaseStringPromptTemplate<InputValues<Extract<keyof RunInput, string>>, string> | ImagePromptTemplate<InputValues<Extract<keyof RunInput, string>>, string> | MessageStringPromptTemplateFields<InputValues<Extract<keyof RunInput, string>>> | DictPromptTemplate<InputValues<Extract<keyof RunInput, string>>>>;
  protected messageClass?: MessageClass;
  static _messageClass(): MessageClass;
  protected chatMessageClass?: ChatMessageClass;
  constructor(/** @TODO When we come up with a better way to type prompt templates, fix this */

  fields: any, additionalOptions?: _StringImageMessagePromptTemplateOptions);
  createMessage(content: MessageContent): any;
  getRoleFromMessageClass(name: string): "ai" | "chat" | "human" | "system";
  static fromTemplate(template: string | Array<string | _TextTemplateParam | _ImageTemplateParam | Record<string, unknown>>, additionalOptions?: _StringImageMessagePromptTemplateOptions): _StringImageMessagePromptTemplate<any, BaseMessage<MessageStructure<MessageToolSet>, MessageType>[]>;
  format(input: TypedPromptInputValues<RunInput>): Promise<BaseMessage>;
  formatMessages(values: RunInput): Promise<RunOutput>;
}
/**
 * Class that represents a human message prompt template. It extends the
 * BaseMessageStringPromptTemplate.
 * @example
 * ```typescript
 * const message = HumanMessagePromptTemplate.fromTemplate("{text}");
 * const formatted = await message.format({ text: "Hello world!" });
 *
 * const chatPrompt = ChatPromptTemplate.fromMessages([message]);
 * const formattedChatPrompt = await chatPrompt.invoke({
 *   text: "Hello world!",
 * });
 * ```
 */
declare class HumanMessagePromptTemplate<RunInput extends InputValues = any> extends _StringImageMessagePromptTemplate<RunInput> {
  static _messageClass(): typeof HumanMessage;
  static lc_name(): string;
}
/**
 * Class that represents an AI message prompt template. It extends the
 * BaseMessageStringPromptTemplate.
 */
declare class AIMessagePromptTemplate<RunInput extends InputValues = any> extends _StringImageMessagePromptTemplate<RunInput> {
  static _messageClass(): typeof AIMessage;
  static lc_name(): string;
}
/**
 * Class that represents a system message prompt template. It extends the
 * BaseMessageStringPromptTemplate.
 * @example
 * ```typescript
 * const message = SystemMessagePromptTemplate.fromTemplate("{text}");
 * const formatted = await message.format({ text: "Hello world!" });
 *
 * const chatPrompt = ChatPromptTemplate.fromMessages([message]);
 * const formattedChatPrompt = await chatPrompt.invoke({
 *   text: "Hello world!",
 * });
 * ```
 */
declare class SystemMessagePromptTemplate<RunInput extends InputValues = any> extends _StringImageMessagePromptTemplate<RunInput> {
  static _messageClass(): typeof SystemMessage;
  static lc_name(): string;
}
/**
 * Interface for the input of a ChatPromptTemplate.
 */
interface ChatPromptTemplateInput<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BasePromptTemplateInput<RunInput, PartialVariableName> {
  /**
   * The prompt messages
   */
  promptMessages: Array<BaseMessagePromptTemplate | BaseMessage>;
  /**
   * Whether to try validating the template on initialization
   *
   * @defaultValue `true`
   */
  validateTemplate?: boolean;
  /**
   * The formatting method to use on the prompt.
   * @default "f-string"
   */
  templateFormat?: TemplateFormat;
}
type BaseMessagePromptTemplateLike = BaseMessagePromptTemplate | BaseMessageLike;
/**
 * Class that represents a chat prompt. It extends the
 * BaseChatPromptTemplate and uses an array of BaseMessagePromptTemplate
 * instances to format a series of messages for a conversation.
 * @example
 * ```typescript
 * const message = SystemMessagePromptTemplate.fromTemplate("{text}");
 * const chatPrompt = ChatPromptTemplate.fromMessages([
 *   ["ai", "You are a helpful assistant."],
 *   message,
 * ]);
 * const formattedChatPrompt = await chatPrompt.invoke({
 *   text: "Hello world!",
 * });
 * ```
 */
declare class ChatPromptTemplate<RunInput extends InputValues = any, PartialVariableName extends string = any> extends BaseChatPromptTemplate<RunInput, PartialVariableName> implements ChatPromptTemplateInput<RunInput, PartialVariableName> {
  static lc_name(): string;
  get lc_aliases(): Record<string, string>;
  promptMessages: Array<BaseMessagePromptTemplate | BaseMessage>;
  validateTemplate: boolean;
  templateFormat: TemplateFormat;
  constructor(input: ChatPromptTemplateInput<RunInput, PartialVariableName>);
  _getPromptType(): "chat";
  private _parseImagePrompts;
  formatMessages(values: TypedPromptInputValues<RunInput>): Promise<BaseMessage[]>;
  partial<NewPartialVariableName extends string>(values: PartialValues<NewPartialVariableName>): Promise<ChatPromptTemplate<InputValues<Exclude<Extract<keyof RunInput, string>, NewPartialVariableName>>, any>>;
  /**
   * Load prompt template from a template f-string
   */
  static fromTemplate<RunInput extends InputValues = Symbol, T extends string = string>(template: T, options?: Omit<PromptTemplateInput<RunInput, string, "f-string">, "template" | "inputVariables">): ChatPromptTemplate<ExtractedFStringParams<T, RunInput>>;
  static fromTemplate<RunInput extends InputValues = Symbol, T extends string = string>(template: T, options?: Omit<PromptTemplateInput<RunInput, string>, "template" | "inputVariables">): ChatPromptTemplate<ExtractedFStringParams<T, RunInput>>;
  static fromTemplate<RunInput extends InputValues = Symbol, T extends string = string>(template: T, options?: Omit<PromptTemplateInput<RunInput, string, "mustache">, "template" | "inputVariables">): ChatPromptTemplate<InputValues>;
  /**
   * Create a chat model-specific prompt from individual chat messages
   * or message-like tuples.
   * @param promptMessages Messages to be passed to the chat model
   * @returns A new ChatPromptTemplate
   */
  static fromMessages<RunInput extends InputValues = any, Extra extends ChatPromptTemplateInput<RunInput> = ChatPromptTemplateInput<RunInput>>(promptMessages: (ChatPromptTemplate<InputValues, string> | BaseMessagePromptTemplateLike)[], extra?: Omit<Extra, "inputVariables" | "promptMessages" | "partialVariables">): ChatPromptTemplate<RunInput>;
}
//#endregion
export { AIMessagePromptTemplate, BaseChatPromptTemplate, BaseMessagePromptTemplate, BaseMessagePromptTemplateLike, BaseMessageStringPromptTemplate, ChatMessagePromptTemplate, ChatMessagePromptTemplateFields, ChatPromptTemplate, ChatPromptTemplateInput, HumanMessagePromptTemplate, MessageStringPromptTemplateFields, MessagesPlaceholder, MessagesPlaceholderFields, SystemMessagePromptTemplate };
//# sourceMappingURL=chat.d.cts.map