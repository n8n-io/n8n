import {
  LanguageModelV3CallOptions,
  SharedV3Warning,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { validateTypes } from '@ai-sdk/provider-utils';
import { fileSearchArgsSchema } from '../tool/file-search';
import { mcpServerArgsSchema } from '../tool/mcp-server';
import { webSearchArgsSchema } from '../tool/web-search';
import { xSearchArgsSchema } from '../tool/x-search';
import { XaiResponsesTool } from './xai-responses-api';

type XaiResponsesToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; name: string };

export async function prepareResponsesTools({
  tools,
  toolChoice,
}: {
  tools: LanguageModelV3CallOptions['tools'];
  toolChoice?: LanguageModelV3CallOptions['toolChoice'];
}): Promise<{
  tools: Array<XaiResponsesTool> | undefined;
  toolChoice: XaiResponsesToolChoice | undefined;
  toolWarnings: SharedV3Warning[];
}> {
  const normalizedTools = tools?.length ? tools : undefined;

  const toolWarnings: SharedV3Warning[] = [];

  if (normalizedTools == null) {
    return { tools: undefined, toolChoice: undefined, toolWarnings };
  }

  const xaiTools: Array<XaiResponsesTool> = [];
  const toolByName = new Map<string, (typeof normalizedTools)[number]>();

  for (const tool of normalizedTools) {
    toolByName.set(tool.name, tool);

    if (tool.type === 'provider') {
      switch (tool.id) {
        case 'xai.web_search': {
          const args = await validateTypes({
            value: tool.args,
            schema: webSearchArgsSchema,
          });

          xaiTools.push({
            type: 'web_search',
            allowed_domains: args.allowedDomains,
            excluded_domains: args.excludedDomains,
            enable_image_understanding: args.enableImageUnderstanding,
          });
          break;
        }

        case 'xai.x_search': {
          const args = await validateTypes({
            value: tool.args,
            schema: xSearchArgsSchema,
          });

          xaiTools.push({
            type: 'x_search',
            allowed_x_handles: args.allowedXHandles,
            excluded_x_handles: args.excludedXHandles,
            from_date: args.fromDate,
            to_date: args.toDate,
            enable_image_understanding: args.enableImageUnderstanding,
            enable_video_understanding: args.enableVideoUnderstanding,
          });
          break;
        }

        case 'xai.code_execution': {
          xaiTools.push({
            type: 'code_interpreter',
          });
          break;
        }

        case 'xai.view_image': {
          xaiTools.push({
            type: 'view_image',
          });
          break;
        }

        case 'xai.view_x_video': {
          xaiTools.push({
            type: 'view_x_video',
          });
          break;
        }

        case 'xai.file_search': {
          const args = await validateTypes({
            value: tool.args,
            schema: fileSearchArgsSchema,
          });

          xaiTools.push({
            type: 'file_search',
            vector_store_ids: args.vectorStoreIds,
            max_num_results: args.maxNumResults,
          });
          break;
        }

        case 'xai.mcp': {
          const args = await validateTypes({
            value: tool.args,
            schema: mcpServerArgsSchema,
          });

          xaiTools.push({
            type: 'mcp',
            server_url: args.serverUrl,
            server_label: args.serverLabel,
            server_description: args.serverDescription,
            allowed_tools: args.allowedTools,
            headers: args.headers,
            authorization: args.authorization,
          });
          break;
        }

        default: {
          toolWarnings.push({
            type: 'unsupported',
            feature: `provider-defined tool ${tool.name}`,
          });
          break;
        }
      }
    } else {
      xaiTools.push({
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
        ...(tool.strict != null ? { strict: tool.strict } : {}),
      });
    }
  }

  if (toolChoice == null) {
    return { tools: xaiTools, toolChoice: undefined, toolWarnings };
  }

  const type = toolChoice.type;

  switch (type) {
    case 'auto':
    case 'none':
      return { tools: xaiTools, toolChoice: type, toolWarnings };
    case 'required':
      return { tools: xaiTools, toolChoice: 'required', toolWarnings };
    case 'tool': {
      const selectedTool = toolByName.get(toolChoice.toolName);

      if (selectedTool == null) {
        return {
          tools: xaiTools,
          toolChoice: undefined,
          toolWarnings,
        };
      }

      if (selectedTool.type === 'provider') {
        // xAI API does not support forcing specific server-side tools via toolChoice
        // Only function tools can be forced with {"type": "function", "function": {"name": "..."}}
        toolWarnings.push({
          type: 'unsupported',
          feature: `toolChoice for server-side tool "${selectedTool.name}"`,
        });
        return { tools: xaiTools, toolChoice: undefined, toolWarnings };
      }

      return {
        tools: xaiTools,
        toolChoice: { type: 'function', name: selectedTool.name },
        toolWarnings,
      };
    }
    default: {
      const _exhaustiveCheck: never = type;
      throw new UnsupportedFunctionalityError({
        functionality: `tool choice type: ${_exhaustiveCheck}`,
      });
    }
  }
}
