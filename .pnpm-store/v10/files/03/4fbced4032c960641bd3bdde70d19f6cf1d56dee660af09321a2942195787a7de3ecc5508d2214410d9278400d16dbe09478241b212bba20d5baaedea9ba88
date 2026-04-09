import {
  InferToolInput,
  InferToolOutput,
  Tool,
  ToolCall,
} from '@ai-sdk/provider-utils';
import { ToolSet } from '../generate-text';
import { ProviderMetadata } from '../types/provider-metadata';
import { DeepPartial } from '../util/deep-partial';
import { ValueOf } from '../util/value-of';

/**
 * The data types that can be used in the UI message for the UI message data parts.
 */
export type UIDataTypes = Record<string, unknown>;

export type UITool = {
  input: unknown;
  output: unknown | undefined;
};

/**
 * Infer the input and output types of a tool so it can be used as a UI tool.
 */
export type InferUITool<TOOL extends Tool> = {
  input: InferToolInput<TOOL>;
  output: InferToolOutput<TOOL>;
};

/**
 * Infer the input and output types of a tool set so it can be used as a UI tool set.
 */
export type InferUITools<TOOLS extends ToolSet> = {
  [NAME in keyof TOOLS & string]: InferUITool<TOOLS[NAME]>;
};

export type UITools = Record<string, UITool>;

/**
 * AI SDK UI Messages. They are used in the client and to communicate between the frontend and the API routes.
 */
export interface UIMessage<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> {
  /**
   * A unique identifier for the message.
   */
  id: string;

  /**
   * The role of the message.
   */
  role: 'system' | 'user' | 'assistant';

  /**
   * The metadata of the message.
   */
  metadata?: METADATA;

  /**
   * The parts of the message. Use this for rendering the message in the UI.
   *
   * System messages should be avoided (set the system prompt on the server instead).
   * They can have text parts.
   *
   * User messages can have text parts and file parts.
   *
   * Assistant messages can have text, reasoning, tool invocation, and file parts.
   */
  parts: Array<UIMessagePart<DATA_PARTS, TOOLS>>;
}

export type UIMessagePart<
  DATA_TYPES extends UIDataTypes,
  TOOLS extends UITools,
> =
  | TextUIPart
  | ReasoningUIPart
  | ToolUIPart<TOOLS>
  | DynamicToolUIPart
  | SourceUrlUIPart
  | SourceDocumentUIPart
  | FileUIPart
  | DataUIPart<DATA_TYPES>
  | StepStartUIPart;

/**
 * A text part of a message.
 */
export type TextUIPart = {
  type: 'text';

  /**
   * The text content.
   */
  text: string;

  /**
   * The state of the text part.
   */
  state?: 'streaming' | 'done';

  /**
   * The provider metadata.
   */
  providerMetadata?: ProviderMetadata;
};

/**
 * A reasoning part of a message.
 */
export type ReasoningUIPart = {
  type: 'reasoning';

  /**
   * The reasoning text.
   */
  text: string;

  /**
   * The state of the reasoning part.
   */
  state?: 'streaming' | 'done';

  /**
   * The provider metadata.
   */
  providerMetadata?: ProviderMetadata;
};

/**
 * A source part of a message.
 */
export type SourceUrlUIPart = {
  type: 'source-url';
  sourceId: string;
  url: string;
  title?: string;
  providerMetadata?: ProviderMetadata;
};

/**
 * A document source part of a message.
 */
export type SourceDocumentUIPart = {
  type: 'source-document';
  sourceId: string;
  mediaType: string;
  title: string;
  filename?: string;
  providerMetadata?: ProviderMetadata;
};

/**
 * A file part of a message.
 */
export type FileUIPart = {
  type: 'file';

  /**
   * IANA media type of the file.
   *
   * @see https://www.iana.org/assignments/media-types/media-types.xhtml
   */
  mediaType: string;

  /**
   * Optional filename of the file.
   */
  filename?: string;

  /**
   * The URL of the file.
   * It can either be a URL to a hosted file or a [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
   */
  url: string;

  /**
   * The provider metadata.
   */
  providerMetadata?: ProviderMetadata;
};

/**
 * A step boundary part of a message.
 */
export type StepStartUIPart = {
  type: 'step-start';
};

export type DataUIPart<DATA_TYPES extends UIDataTypes> = ValueOf<{
  [NAME in keyof DATA_TYPES & string]: {
    type: `data-${NAME}`;
    id?: string;
    data: DATA_TYPES[NAME];
  };
}>;

type asUITool<TOOL extends UITool | Tool> = TOOL extends Tool
  ? InferUITool<TOOL>
  : TOOL;

/**
 * Check if a message part is a data part.
 */
export function isDataUIPart<DATA_TYPES extends UIDataTypes>(
  part: UIMessagePart<DATA_TYPES, UITools>,
): part is DataUIPart<DATA_TYPES> {
  return part.type.startsWith('data-');
}

/**
 * A UI tool invocation contains all the information needed to render a tool invocation in the UI.
 * It can be derived from a tool without knowing the tool name, and can be used to define
 * UI components for the tool.
 */
export type UIToolInvocation<TOOL extends UITool | Tool> = {
  /**
   * ID of the tool call.
   */
  toolCallId: string;
  title?: string;

  /**
   * Whether the tool call was executed by the provider.
   */
  providerExecuted?: boolean;
} & (
  | {
      state: 'input-streaming';
      input: DeepPartial<asUITool<TOOL>['input']> | undefined;
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval?: never;
    }
  | {
      state: 'input-available';
      input: asUITool<TOOL>['input'];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval?: never;
    }
  | {
      state: 'approval-requested';
      input: asUITool<TOOL>['input'];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved?: never;
        reason?: never;
      };
    }
  | {
      state: 'approval-responded';
      input: asUITool<TOOL>['input'];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved: boolean;
        reason?: string;
      };
    }
  | {
      state: 'output-available';
      input: asUITool<TOOL>['input'];
      output: asUITool<TOOL>['output'];
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      resultProviderMetadata?: ProviderMetadata;
      preliminary?: boolean;
      approval?: {
        id: string;
        approved: true;
        reason?: string;
      };
    }
  | {
      state: 'output-error'; // TODO AI SDK 6: change to 'error' state
      input: asUITool<TOOL>['input'] | undefined;
      rawInput?: unknown; // TODO AI SDK 6: remove this field, input should be unknown
      output?: never;
      errorText: string;
      callProviderMetadata?: ProviderMetadata;
      resultProviderMetadata?: ProviderMetadata;
      approval?: {
        id: string;
        approved: true;
        reason?: string;
      };
    }
  | {
      state: 'output-denied';
      input: asUITool<TOOL>['input'];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved: false;
        reason?: string;
      };
    }
);

export type ToolUIPart<TOOLS extends UITools = UITools> = ValueOf<{
  [NAME in keyof TOOLS & string]: {
    type: `tool-${NAME}`;
  } & UIToolInvocation<TOOLS[NAME]>;
}>;

export type DynamicToolUIPart = {
  type: 'dynamic-tool';

  /**
   * Name of the tool that is being called.
   */
  toolName: string;

  /**
   * ID of the tool call.
   */
  toolCallId: string;
  title?: string;

  /**
   * Whether the tool call was executed by the provider.
   */
  providerExecuted?: boolean;
} & (
  | {
      state: 'input-streaming';
      input: unknown | undefined;
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval?: never;
    }
  | {
      state: 'input-available';
      input: unknown;
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval?: never;
    }
  | {
      state: 'approval-requested';
      input: unknown;
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved?: never;
        reason?: never;
      };
    }
  | {
      state: 'approval-responded';
      input: unknown;
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved: boolean;
        reason?: string;
      };
    }
  | {
      state: 'output-available';
      input: unknown;
      output: unknown;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      resultProviderMetadata?: ProviderMetadata;
      preliminary?: boolean;
      approval?: {
        id: string;
        approved: true;
        reason?: string;
      };
    }
  | {
      state: 'output-error'; // TODO AI SDK 6: change to 'error' state
      input: unknown;
      output?: never;
      errorText: string;
      callProviderMetadata?: ProviderMetadata;
      resultProviderMetadata?: ProviderMetadata;
      approval?: {
        id: string;
        approved: true;
        reason?: string;
      };
    }
  | {
      state: 'output-denied';
      input: unknown;
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved: false;
        reason?: string;
      };
    }
);

/**
 * Type guard to check if a message part is a text part.
 */
export function isTextUIPart(
  part: UIMessagePart<UIDataTypes, UITools>,
): part is TextUIPart {
  return part.type === 'text';
}

/**
 * Type guard to check if a message part is a file part.
 */
export function isFileUIPart(
  part: UIMessagePart<UIDataTypes, UITools>,
): part is FileUIPart {
  return part.type === 'file';
}

/**
 * Type guard to check if a message part is a reasoning part.
 */
export function isReasoningUIPart(
  part: UIMessagePart<UIDataTypes, UITools>,
): part is ReasoningUIPart {
  return part.type === 'reasoning';
}

/**
 * Check if a message part is a static tool part.
 *
 * Static tools are tools for which the types are known at development time.
 */
export function isStaticToolUIPart<TOOLS extends UITools>(
  part: UIMessagePart<UIDataTypes, TOOLS>,
): part is ToolUIPart<TOOLS> {
  return part.type.startsWith('tool-');
}

/**
 * Check if a message part is a dynamic tool part.
 *
 * Dynamic tools are tools for which the input and output types are unknown.
 */
export function isDynamicToolUIPart(
  part: UIMessagePart<UIDataTypes, UITools>,
): part is DynamicToolUIPart {
  return part.type === 'dynamic-tool';
}

/**
 * Check if a message part is a tool part.
 *
 * Tool parts are either static or dynamic tools.
 *
 * Use `isStaticToolUIPart` or `isDynamicToolUIPart` to check the type of the tool.
 */
export function isToolUIPart<TOOLS extends UITools>(
  part: UIMessagePart<UIDataTypes, TOOLS>,
): part is ToolUIPart<TOOLS> | DynamicToolUIPart {
  return isStaticToolUIPart(part) || isDynamicToolUIPart(part);
}

/**
 * @deprecated Use isToolUIPart instead.
 */
export const isToolOrDynamicToolUIPart = isToolUIPart;

/**
 * Returns the name of the static tool.
 *
 * The possible values are the keys of the tool set.
 */
export function getStaticToolName<TOOLS extends UITools>(
  part: ToolUIPart<TOOLS>,
): keyof TOOLS {
  return part.type.split('-').slice(1).join('-') as keyof TOOLS;
}

/**
 * Returns the name of the tool (static or dynamic).
 *
 * This function will not restrict the name to the keys of the tool set.
 * If you need to restrict the name to the keys of the tool set, use `getStaticToolName` instead.
 */
export function getToolName(
  part: ToolUIPart<UITools> | DynamicToolUIPart,
): string {
  return isDynamicToolUIPart(part) ? part.toolName : getStaticToolName(part);
}

/**
 * @deprecated Use getToolName instead.
 */
export const getToolOrDynamicToolName = getToolName;

export type InferUIMessageMetadata<T extends UIMessage> =
  T extends UIMessage<infer METADATA> ? METADATA : unknown;

export type InferUIMessageData<T extends UIMessage> =
  T extends UIMessage<unknown, infer DATA_TYPES> ? DATA_TYPES : UIDataTypes;

export type InferUIMessageTools<T extends UIMessage> =
  T extends UIMessage<unknown, UIDataTypes, infer TOOLS> ? TOOLS : UITools;

export type InferUIMessageToolOutputs<UI_MESSAGE extends UIMessage> =
  InferUIMessageTools<UI_MESSAGE>[keyof InferUIMessageTools<UI_MESSAGE>]['output'];

export type InferUIMessageToolCall<UI_MESSAGE extends UIMessage> =
  | ValueOf<{
      [NAME in keyof InferUIMessageTools<UI_MESSAGE>]: ToolCall<
        NAME & string,
        InferUIMessageTools<UI_MESSAGE>[NAME] extends { input: infer INPUT }
          ? INPUT
          : never
      > & { dynamic?: false };
    }>
  | (ToolCall<string, unknown> & { dynamic: true });

export type InferUIMessagePart<UI_MESSAGE extends UIMessage> = UIMessagePart<
  InferUIMessageData<UI_MESSAGE>,
  InferUIMessageTools<UI_MESSAGE>
>;
