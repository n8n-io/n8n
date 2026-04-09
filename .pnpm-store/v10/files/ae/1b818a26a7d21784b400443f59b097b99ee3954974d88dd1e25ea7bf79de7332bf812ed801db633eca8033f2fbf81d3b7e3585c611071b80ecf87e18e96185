import {
  LanguageModelV3CallOptions,
  SharedV3Warning,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import {
  OpenAIChatToolChoice,
  OpenAIChatFunctionTool,
} from './openai-chat-api';

export function prepareChatTools({
  tools,
  toolChoice,
}: {
  tools: LanguageModelV3CallOptions['tools'];
  toolChoice?: LanguageModelV3CallOptions['toolChoice'];
}): {
  tools?: OpenAIChatFunctionTool[];
  toolChoice?: OpenAIChatToolChoice;
  toolWarnings: Array<SharedV3Warning>;
} {
  // when the tools array is empty, change it to undefined to prevent errors:
  tools = tools?.length ? tools : undefined;

  const toolWarnings: SharedV3Warning[] = [];

  if (tools == null) {
    return { tools: undefined, toolChoice: undefined, toolWarnings };
  }

  const openaiTools: OpenAIChatFunctionTool[] = [];

  for (const tool of tools) {
    switch (tool.type) {
      case 'function':
        openaiTools.push({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
            ...(tool.strict != null ? { strict: tool.strict } : {}),
          },
        });
        break;
      default:
        toolWarnings.push({
          type: 'unsupported',
          feature: `tool type: ${tool.type}`,
        });
        break;
    }
  }

  if (toolChoice == null) {
    return { tools: openaiTools, toolChoice: undefined, toolWarnings };
  }

  const type = toolChoice.type;

  switch (type) {
    case 'auto':
    case 'none':
    case 'required':
      return { tools: openaiTools, toolChoice: type, toolWarnings };
    case 'tool':
      return {
        tools: openaiTools,
        toolChoice: {
          type: 'function',
          function: {
            name: toolChoice.toolName,
          },
        },
        toolWarnings,
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new UnsupportedFunctionalityError({
        functionality: `tool choice type: ${_exhaustiveCheck}`,
      });
    }
  }
}
