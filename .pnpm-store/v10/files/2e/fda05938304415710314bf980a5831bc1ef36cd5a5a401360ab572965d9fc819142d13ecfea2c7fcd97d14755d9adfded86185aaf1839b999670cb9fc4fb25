import { ContentBlock } from "./content/index.js";
import { ResponseMetadata, UsageMetadata } from "./metadata.js";
import { $MergeDiscriminatedUnion, $MergeObjects } from "./utils.js";

//#region ../langchain-core/dist/messages/message.d.ts

//#region src/messages/message.d.ts
/**
 * Represents the possible types of messages in the system.
 * Includes standard message types ("ai", "human", "tool", "system")
 * and allows for custom string types that are non-null.
 *
 * @example
 * ```ts
 * // Standard message types
 * const messageType1: MessageType = "ai";
 * const messageType2: MessageType = "human";
 *
 * // Custom message type
 * const messageType3: MessageType = "custom_type";
 * ```
 */
type MessageType = "ai" | "human" | "tool" | "system" | (string & NonNullable<unknown>);
/**
 * Represents the output version format for message content.
 *
 * This type determines how the content field is structured in a message:
 * - "v0": Content is represented as a simple string or array of content blocks
 *   - provides backward compatibility with simpler content representations
 * - "v1": Content follows the structured ContentBlock format with typed discriminated unions
 *   - enables full type safety and structured content block handling
 *
 * @example
 * ```ts
 * // v0 format - simple content representation
 * const v0Message: Message<{ outputVersion: "v0", content: ... }> = {
 *   type: "human",
 *   content: "Hello world" // string | Array<ContentBlock | ContentBlock.Text>
 * };
 *
 * // v1 format - structured content blocks
 * const v1Message: Message<{ outputVersion: "v1", content: ... }> = {
 *   type: "human",
 *   content: [
 *     { type: "text", text: "Hello world" },
 *     { type: "image", image_url: "..." }
 *   ] // Array<ContentBlock | ...> (determined by the structure)
 * };
 * ```
 */
type MessageOutputVersion = "v0" | "v1";
/**
 * Represents the input and output types of a tool that can be used in messages.
 *
 * @template TInput - The type of input the tool accepts.
 * @template TOutput - The type of output the tool produces.
 *
 * @example
 * ```ts
 * // Tool that takes a string input and returns a number
 * interface StringToNumberTool extends MessageToolDefinition<string, number> {
 *   input: string;
 *   output: number;
 * }
 * ```
 */
interface MessageToolDefinition<TInput = unknown, TOutput = unknown> {
  input: TInput;
  output: TOutput;
}
/**
 * Represents a structured set of tools by mapping tool names to definitions
 * that can be used in messages.
 *
 * @example
 * ```ts
 * interface MyToolSet extends MessageToolSet {
 *   calculator: MessageToolDefinition<
 *     { operation: string; numbers: number[] },
 *     number
 *   >;
 *   translator: MessageToolDefinition<
 *     { text: string; targetLanguage: string },
 *     string
 *   >;
 * }
 * ```
 */
interface MessageToolSet {
  [key: string]: MessageToolDefinition;
}
/**
 * Represents a tool call block within a message structure by mapping tool names to their
 * corresponding tool call formats, including the input arguments and an optional identifier.
 *
 * @template TStructure - A message structure type that may contain tool definitions
 *
 * @example
 * ```ts
 * // Given a message structure with a calculator tool:
 * interface MyStructure extends MessageStructure {
 *   tools: {
 *     calculator: MessageToolDefinition<{ operation: string, numbers: number[] }, number>
 *   }
 * }
 *
 * // The tool call block would be:
 * type CalcToolCall = $MessageToolCallBlock<MyStructure>;
 * // Resolves to:
 * // {
 * //   type: "tool_call";
 * //   name: "calculator";
 * //   args: { operation: string, numbers: number[] };
 * //   id?: string;
 * // }
 * ```
 */
type $MessageToolCallBlock<TStructure extends MessageStructure> = TStructure["tools"] extends MessageToolSet ? { [K in keyof TStructure["tools"]]: K extends string ? TStructure["tools"][K] extends MessageToolDefinition ? ContentBlock.Tools.ToolCall<K, TStructure["tools"][K]["input"]> : never : never }[keyof TStructure["tools"]] : never;
/**
 * Core interface that defines the structure of messages.
 *
 * @example
 * ```ts
 * // Basic message structure with just content blocks
 * interface SimpleMessageStructure extends MessageStructure {
 *   content: {
 *     human: ContentBlock.Text;
 *     // allows for text + reasoning blocks in ai messages
 *     ai: ContentBlock.Text | ContentBlock.Reasoning;
 *   }
 * }
 *
 * // Message structure with tools and properties
 * interface AdvancedMessageStructure extends MessageStructure {
 *   tools: {
 *     calculator: MessageToolDefinition<
 *       { operation: string; numbers: number[] },
 *       number
 *     >;
 *   };
 *   content: {
 *     // allows for text + image blocks in human messages
 *     human: ContentBlock.Text | ContentBlock.Multimodal.Image;
 *     // only allows for text blocks in ai messages
 *     ai: ContentBlock.Text;
 *   };
 *   properties: {
 *     // pins properties to ai messages
 *     ai: {
 *       response_metadata: {
 *         confidence: number;
 *         model: string;
 *       };
 *     };
 *   }
 * }
 *
 * // Using with $MergeMessageStructure to combine structures
 * // The resulting type when passed into BaseMessage will have a calculator tool,
 * // allow for text + image blocks in human messages,
 * // and text + reasoning blocks + additional arbitrary properties in ai messages.
 * type CombinedStructure = $MergeMessageStructure<
 *   SimpleMessageStructure,
 *   AdvancedMessageStructure
 * >;
 *
 * // Using in a Message object
 * const message: Message<CombinedStructure> = {
 *   id: "msg-123",
 *   type: "human",
 *   content: [
 *     { type: "text", text: "Hello!" }
 *     { type: "image", mimeType: "image/jpeg", url: "https://example.com/image.jpg" }
 *     // this block will throw an error because it's not defined in the structure
 *     { type: "reasoning", reasoning: "The answer is 42" }
 *   ]
 * };
 * ```
 */
interface MessageStructure {
  /**
   * Optional output version for the message structure.
   * If not provided, defaults to "v0".
   */
  readonly outputVersion?: MessageOutputVersion;
  /**
   * Optional set of tool definitions that can be used in messages.
   * Each tool is defined with input/output types and can be referenced in tool messages.
   */
  readonly tools?: MessageToolSet;
  /**
   * Optional mapping of message types to their allowed content blocks.
   * Each message type can specify what content block types it supports (text, images, etc).
   */
  readonly content?: Partial<{ [key in MessageType]: ContentBlock }>;
  /**
   * Optional mapping of message types to arbitrary property objects.
   * Allows attaching custom metadata or other information to specific message types.
   */
  readonly properties?: Partial<{ [key in MessageType]: Record<string, unknown> }>;
}
/**
 * Normalizes an arbitrary type to a message output version or undefined.
 * Accepts unknown and narrows to a valid MessageOutputVersion if present.
 */
type $NormalizeMessageOutputVersion<T> = Extract<T, MessageOutputVersion> | undefined;
/**
 * Merges two output version types from message structures.
 *
 * This utility type determines the resulting output version when combining two message structures.
 * The merge logic follows these rules:
 *
 * - If both T and U are undefined, defaults to "v0" for backwards compatibility
 * - If T is undefined but U is defined, uses U's version
 * - If U is undefined but T is defined, uses T's version
 * - If both T and U are defined, U takes precedence (later structure wins)
 *
 * @template T - The output version from the first message structure
 * @template U - The output version from the second message structure
 *
 * @example
 * ```ts
 * // Both undefined - defaults to "v0"
 * type Result1 = $MergeOutputVersion<undefined, undefined>; // "v0"
 *
 * // One defined - uses the defined version
 * type Result2 = $MergeOutputVersion<undefined, "v1">; // "v1"
 * type Result3 = $MergeOutputVersion<"v0", undefined>; // "v0"
 *
 * // Both defined - second takes precedence
 * type Result4 = $MergeOutputVersion<"v0", "v1">; // "v1"
 * ```
 */
type $MergeOutputVersion<T, U> = $NormalizeMessageOutputVersion<T> extends infer TV ? $NormalizeMessageOutputVersion<U> extends infer UV ? [TV, UV] extends [undefined, undefined] ? "v0" : [TV] extends [undefined] ? Exclude<UV, undefined> : [UV] extends [undefined] ? Exclude<TV, undefined> : UV : never : never;
/**
 * Merges two content definition objects from message structures.
 *
 * This utility type combines content definitions from two message structures, handling
 * the merging of content block types for each message type. The merge logic follows
 * these rules:
 *
 * - For keys that exist in both T and U: Merges the content blocks using discriminated
 *   union merging based on the "type" property. This allows combining different content
 *   block types (e.g., text + image) for the same message type.
 * - For keys that exist only in T: Uses T's content definition as-is
 * - For keys that exist only in U: Uses U's content definition as-is
 *
 * @template T - The content definition from the first message structure
 * @template U - The content definition from the second message structure
 *
 * @example
 * ```ts
 * // T allows text content for human messages
 * type ContentA = {
 *   human: ContentBlock.Text;
 * };
 *
 * // U allows image content for human messages and text for AI messages
 * type ContentB = {
 *   human: ContentBlock.Multimodal.Image;
 *   ai: ContentBlock.Text;
 * };
 *
 * // Merged result allows both text and images for human messages, text for AI
 * type Merged = $MergeContentDefinition<ContentA, ContentB>;
 * // Result: {
 * //   human: ContentBlock.Text | ContentBlock.Multimodal.Image;
 * //   ai: ContentBlock.Text;
 * // }
 * ```
 */
type $MergeContentDefinition<T, U> = { [K in keyof T | keyof U as Extract<(K extends keyof T ? T[K] : never) | (K extends keyof U ? U[K] : never), ContentBlock> extends never ? never : K]: K extends keyof T ? K extends keyof U ? $MergeDiscriminatedUnion<Extract<T[K], ContentBlock>, Extract<U[K], ContentBlock>, "type"> : Extract<T[K], ContentBlock> : K extends keyof U ? Extract<U[K], ContentBlock> : never };
/**
 * Merges two message structures A and B into a combined structure.
 * This is a type utility that handles merging of tools, content blocks, and properties
 * from two message structures. The resulting type is usable as its own message structure.
 *
 * @example
 * ```ts
 * // Structure A allows text in human messages and has a confidence property on AI messages
 * interface StructureA extends MessageStructure {
 *   content: {
 *     human: ContentBlock.Text;
 *   };
 *   properties: {
 *     ai: { confidence: number };
 *   }
 * }
 *
 * // Structure B allows images in human messages and has a model property on AI messages
 * interface StructureB extends MessageStructure {
 *   content: {
 *     human: ContentBlock.Multimodal.Image;
 *   };
 *   properties: {
 *     ai: { model: string };
 *   }
 * }
 *
 * // Merged structure allows both text and images in human messages
 * // AI messages have both confidence and model properties
 * type Merged = $MergeMessageStructure<StructureA, StructureB>;
 * ```
 *
 * @template A - First message structure to merge
 * @template B - Second message structure to merge (takes precedence over A)
 */
type $MergeMessageStructure<T extends MessageStructure, U extends MessageStructure> = {
  outputVersion: $MergeOutputVersion<T["outputVersion"], U["outputVersion"]>;
  tools: $MergeObjects<T["tools"], U["tools"]>;
  content: $MergeContentDefinition<T["content"], U["content"]>;
  properties: $MergeObjects<T["properties"], U["properties"]>;
};
/**
 * Standard message structured used to define the most basic message structure that's
 * used throughout the library.
 *
 * This is also the message structure that's used when a message structure is not provided.
 */
interface StandardMessageStructure extends MessageStructure {
  content: {
    /** Text content for AI messages */
    ai: ContentBlock.Text;
    /** Text content for human messages */
    human: ContentBlock.Text;
    /** Text content for system messages */
    system: ContentBlock.Text;
    /** Text content for tool messages */
    tool: ContentBlock.Text;
  };
  properties: {
    /** Properties specific to AI messages */
    ai: {
      /** Metadata about the AI model response */
      response_metadata: ResponseMetadata;
      /** Usage statistics for the AI response */
      usage_metadata: UsageMetadata;
    };
    human: {
      /** Metadata about the human message */
      response_metadata: Record<string, unknown>;
    };
    system: {
      /** Metadata about the system message */
      response_metadata: Record<string, unknown>;
    };
    tool: {
      /** Metadata about the tool message */
      response_metadata: Record<string, unknown>;
    };
  };
}
/**
 * Takes a message structure type T and normalizes it by merging it with the standard message structure.
 * If T is already a standard message structure, returns T unchanged.
 *
 * This ensures that any custom message structure includes all the standard message structure fields
 * by default while allowing overrides and extensions.
 *
 * @template T - The message structure type to normalize, must extend MessageStructure
 * @returns Either T if it's already a standard structure, or the merged result of T with standard structure
 */
type $NormalizedMessageStructure<T extends MessageStructure> = T extends StandardMessageStructure ? T : $MergeMessageStructure<StandardMessageStructure, T>;
/**
 * Infers the content blocks for a specific message type in a message structure.
 *
 * This utility type extracts the content block type that corresponds to a given message type
 * from the message structure's content definition.
 *
 * @template TStructure - The message structure to infer content from
 * @template TRole - The message role/type to get content for (e.g., "ai", "human", "system", "tool")
 * @returns The content block type for the specified type, or never if its not defined in the structure
 *
 * @example
 * ```ts
 * interface MyStructure extends MessageStructure {
 *   content: {
 *     human: ContentBlock.Text;
 *     ai: ContentBlock.Text | ContentBlock.ToolCall;
 *   };
 * }
 *
 * type HumanContent = $InferMessageContentBlocks<MyStructure, "human">;
 * // HumanContent = ContentBlock.Text
 *
 * type AIContent = $InferMessageContentBlocks<MyStructure, "ai">;
 * // AIContent = ContentBlock.Text | ContentBlock.ToolCall
 * ```
 */
type $InferMessageContentBlocks<TStructure extends MessageStructure, TRole extends MessageType> = $NormalizedMessageStructure<TStructure> extends infer S ? S extends MessageStructure ? S["content"] extends infer C ? C extends Record<PropertyKey, ContentBlock> ? TRole extends keyof C ? [$MessageToolCallBlock<TStructure>] extends [never] ? C[TRole] : $MergeDiscriminatedUnion<NonNullable<C[TRole]>, $MessageToolCallBlock<TStructure>, "type"> : never : never : never : never : never;
/**
 * Infers the content type for a specific message type from a message structure.
 *
 * This utility type determines the appropriate content type based on the message structure's
 * output version and the specified message type. The content type varies depending on the
 * output version (see {@link MessageOutputVersion})
 *
 * @template TStructure - The message structure to infer content from
 * @template TRole - The message role/type to get content for (e.g., "ai", "human", "system", "tool")
 * @returns The content type for the specified role based on the output version
 *
 * @example
 * ```ts
 * interface MyStructure extends MessageStructure {
 *   outputVersion: "v0";
 *   content: {
 *     human: ContentBlock.Text;
 *     ai: ContentBlock.Text | ContentBlock.ToolCall;
 *   };
 * }
 *
 * type HumanContentV0 = $InferMessageContent<MyStructure, "human">;
 * // HumanContentV0 = string | Array<ContentBlock | ContentBlock.Text>
 *
 * interface MyStructureV1 extends MessageStructure {
 *   outputVersion: "v1";
 *   content: {
 *     human: ContentBlock.Text;
 *     ai: ContentBlock.Text | ContentBlock.Reasoning;
 *   };
 * }
 *
 * type HumanContentV1 = $InferMessageContent<MyStructureV1, "human">;
 * // HumanContentV1 = ContentBlock.Text
 *
 * type AIContentV1 = $InferMessageContent<MyStructureV1, "ai">;
 * // AIContentV1 = ContentBlock.Text | ContentBlock.Reasoning
 * ```
 */
type $InferMessageContent<TStructure extends MessageStructure, TRole extends MessageType> = TStructure["outputVersion"] extends "v1" ? Array<$InferMessageContentBlocks<TStructure, TRole>> : string | Array<ContentBlock | ContentBlock.Text>;
/**
 * Infers the properties for a specific message type from a message structure.
 *
 * This utility type extracts the properties object that corresponds to a given message type
 * from the message structure's properties definition, and excludes the reserved
 * "content" and "type" properties to avoid conflicts with the core message structure.
 *
 * If the specified type is not defined in the message structure's properties, it returns
 * a generic Record<string, unknown> type to allow for arbitrary properties.
 *
 * @template TStructure - The message structure to infer properties from
 * @template TRole - The message type/role to get properties for (e.g., "ai", "human", "system", "tool")
 * @returns The properties object type for the specified type, excluding "content" and "type"
 *
 * @example
 * ```ts
 * interface MyStructure extends MessageStructure {
 *   properties: {
 *     ai: {
 *       response_metadata: { model: string };
 *       usage_metadata: { tokens: number };
 *       content: string; // This will be omitted
 *       type: string;    // This will be omitted
 *     };
 *     human: { metadata: Record<string, unknown> };
 *   };
 * }
 *
 * type AIProperties = $InferMessageProperties<MyStructure, "ai">;
 * // AIProperties = { response_metadata: { model: string }; usage_metadata: { tokens: number } }
 *
 * type HumanProperties = $InferMessageProperties<MyStructure, "human">;
 * // HumanProperties = { metadata: Record<string, unknown> }
 *
 * type SystemProperties = $InferMessageProperties<MyStructure, "system">;
 * // SystemProperties = Record<string, unknown> (fallback for undefined role)
 * ```
 */
type $InferMessageProperties<TStructure extends MessageStructure, TRole extends MessageType> = $NormalizedMessageStructure<TStructure> extends infer S ? S extends MessageStructure ? S["properties"] extends infer P | undefined ? P extends Record<PropertyKey, unknown> ? TRole extends keyof P ? Omit<P[TRole], "content" | "type"> : Record<string, unknown> : Record<string, unknown> : Record<string, unknown> : never : never;
/**
 * Infers the type of a specific property for a message type from a message structure.
 *
 * This utility type extracts the type of a single property by name from the properties
 * object that corresponds to a given message type. If the specified property key does
 * not exist in the type's properties, it returns `never`.
 *
 * @template TStructure - The message structure to infer the property from
 * @template TRole - The message type/role to get the property for (e.g., "ai", "human", "system", "tool")
 * @template K - The property key to extract the type for
 * @returns The type of the specified property, or `never` if the property doesn't exist
 *
 * @example
 * ```ts
 * interface MyStructure extends MessageStructure {
 *   properties: {
 *     ai: {
 *       response_metadata: { model: string; temperature: number };
 *       usage_metadata: { input_tokens: number; output_tokens: number };
 *     };
 *     human: { metadata: Record<string, unknown> };
 *   };
 * }
 *
 * type ResponseMetadata = $InferMessageProperty<MyStructure, "ai", "response_metadata">;
 * // ResponseMetadata = { model: string; temperature: number }
 *
 * type UsageMetadata = $InferMessageProperty<MyStructure, "ai", "usage_metadata">;
 * // UsageMetadata = { input_tokens: number; output_tokens: number }
 *
 * type NonExistentProperty = $InferMessageProperty<MyStructure, "ai", "nonExistent">;
 * // NonExistentProperty = Record<string, unknown>
 *
 * type HumanMetadata = $InferMessageProperty<MyStructure, "human", "metadata">;
 * // HumanMetadata = Record<string, unknown>
 * ```
 */
type $InferMessageProperty<TStructure extends MessageStructure, TRole extends MessageType, K$1 extends string> = K$1 extends keyof $InferMessageProperties<TStructure, TRole> ? $InferMessageProperties<TStructure, TRole>[K$1] : never;
/**
 * Infers the response metadata type for a specific message type from a message structure.
 *
 * This utility type extracts the `response_metadata` property type for a given message type.
 *
 * @template TStructure - The message structure to infer the response metadata from
 * @template TRole - The message type/role to get the response metadata for (e.g., "ai", "human", "system", "tool")
 * @returns The type of the response_metadata property, or `Record<string, unknown>` as fallback
 *
 * @example
 * ```ts
 * interface MyStructure extends MessageStructure {
 *   properties: {
 *     ai: {
 *       response_metadata: { model: string; temperature: number; tokens: number };
 *     };
 *     human: { metadata: Record<string, unknown> };
 *   };
 * }
 *
 * type AIResponseMetadata = $InferResponseMetadata<MyStructure, "ai">;
 * // AIResponseMetadata = { model: string; temperature: number; tokens: number }
 *
 * type HumanResponseMetadata = $InferResponseMetadata<MyStructure, "human">;
 * // HumanResponseMetadata = Record<string, unknown> (fallback since not defined)
 * ```
 */
type $InferResponseMetadata<TStructure extends MessageStructure, TRole extends MessageType> = $InferMessageProperty<TStructure, TRole, "response_metadata"> extends infer P ? [P] extends [never] ? Record<string, unknown> : P : never;
/**
 * Represents a message object that organizes context for an LLM.
 *
 * @example
 * ```ts
 * // Basic message with text content
 * const message: Message = {
 *   id: "msg-123",
 *   name: "user",
 *   type: "human",
 *   content: [{ type: "text", text: "Hello!" }]
 * };
 *
 * // Basic ai message interface extension
 * interface MyMessage extends Message<StandardMessageStructure, "ai"> {
 *   // Additional AI-specific properties can be added here
 * }
 *`
 * // Custom message structure
 * interface CustomStructure extends MessageStructure {
 *   content: {
 *     ai: ContentBlock.Text | ContentBlock.ToolCall<"search", { query: string }>;
 *     human: ContentBlock.Text | ContentBlock.Multimodal.Image;
 *   };
 * }
 *
 * // Create a message with custom structure
 * const message: Message<CustomStructure> = {
 *   id: "msg-123",
 *   name: "user",
 *   type: "ai",
 *   content: [
 *     { type: "text", text: "Hello!" },
 *     {
 *       type: "tool_call",
 *       name: "search",
 *       args: { query: "What is the capital of France?" }
 *     }
 *   ]
 * };
 * ```
 */
interface Message<TStructure extends MessageStructure = StandardMessageStructure, TRole extends MessageType = MessageType> {
  /** The message type/role */
  readonly type: TRole;
  /** Unique identifier for this message */
  id?: string;
  /** Optional name/identifier for the entity that created this message */
  name?: string;
  /** Array of content blocks that make up the message content */
  content: $InferMessageContent<TStructure, TRole>;
  /** Metadata about the message */
  response_metadata?: Partial<$InferResponseMetadata<TStructure, TRole>>;
}
/**
 * Type guard to check if a value is a valid Message object.
 *
 * @param message - The value to check
 * @returns true if the value is a valid Message object, false otherwise
 */
//#endregion
export { $InferMessageContent, $InferResponseMetadata, Message, MessageOutputVersion, MessageStructure, MessageType };
//# sourceMappingURL=message.d.ts.map