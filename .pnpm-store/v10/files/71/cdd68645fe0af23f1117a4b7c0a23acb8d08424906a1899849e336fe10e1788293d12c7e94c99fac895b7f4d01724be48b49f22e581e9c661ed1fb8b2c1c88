import {
  LanguageModelV3CallOptions,
  SharedV3Warning,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { ToolNameMapping, validateTypes } from '@ai-sdk/provider-utils';
import { codeInterpreterArgsSchema } from '../tool/code-interpreter';
import { fileSearchArgsSchema } from '../tool/file-search';
import { imageGenerationArgsSchema } from '../tool/image-generation';
import { customArgsSchema } from '../tool/custom';
import { mcpArgsSchema } from '../tool/mcp';
import { shellArgsSchema } from '../tool/shell';
import { toolSearchArgsSchema } from '../tool/tool-search';
import { webSearchArgsSchema } from '../tool/web-search';
import { webSearchPreviewArgsSchema } from '../tool/web-search-preview';
import { OpenAIResponsesTool } from './openai-responses-api';

export async function prepareResponsesTools({
  tools,
  toolChoice,
  toolNameMapping,
  customProviderToolNames,
}: {
  tools: LanguageModelV3CallOptions['tools'];
  toolChoice: LanguageModelV3CallOptions['toolChoice'] | undefined;
  toolNameMapping?: ToolNameMapping;
  customProviderToolNames?: Set<string>;
}): Promise<{
  tools?: Array<OpenAIResponsesTool>;
  toolChoice?:
    | 'auto'
    | 'none'
    | 'required'
    | { type: 'file_search' }
    | { type: 'web_search_preview' }
    | { type: 'web_search' }
    | { type: 'function'; name: string }
    | { type: 'custom'; name: string }
    | { type: 'code_interpreter' }
    | { type: 'mcp' }
    | { type: 'image_generation' }
    | { type: 'apply_patch' };
  toolWarnings: SharedV3Warning[];
}> {
  // when the tools array is empty, change it to undefined to prevent errors:
  tools = tools?.length ? tools : undefined;

  const toolWarnings: SharedV3Warning[] = [];

  if (tools == null) {
    return { tools: undefined, toolChoice: undefined, toolWarnings };
  }

  const openaiTools: Array<OpenAIResponsesTool> = [];
  const resolvedCustomProviderToolNames =
    customProviderToolNames ?? new Set<string>();

  for (const tool of tools) {
    switch (tool.type) {
      case 'function': {
        const openaiOptions = tool.providerOptions?.openai as
          | { deferLoading?: boolean }
          | undefined;
        const deferLoading = openaiOptions?.deferLoading;

        openaiTools.push({
          type: 'function',
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          ...(tool.strict != null ? { strict: tool.strict } : {}),
          ...(deferLoading != null ? { defer_loading: deferLoading } : {}),
        });
        break;
      }
      case 'provider': {
        switch (tool.id) {
          case 'openai.file_search': {
            const args = await validateTypes({
              value: tool.args,
              schema: fileSearchArgsSchema,
            });

            openaiTools.push({
              type: 'file_search',
              vector_store_ids: args.vectorStoreIds,
              max_num_results: args.maxNumResults,
              ranking_options: args.ranking
                ? {
                    ranker: args.ranking.ranker,
                    score_threshold: args.ranking.scoreThreshold,
                  }
                : undefined,
              filters: args.filters,
            });

            break;
          }
          case 'openai.local_shell': {
            openaiTools.push({
              type: 'local_shell',
            });
            break;
          }
          case 'openai.shell': {
            const args = await validateTypes({
              value: tool.args,
              schema: shellArgsSchema,
            });

            openaiTools.push({
              type: 'shell',
              ...(args.environment && {
                environment: mapShellEnvironment(args.environment),
              }),
            });
            break;
          }
          case 'openai.apply_patch': {
            openaiTools.push({
              type: 'apply_patch',
            });
            break;
          }
          case 'openai.web_search_preview': {
            const args = await validateTypes({
              value: tool.args,
              schema: webSearchPreviewArgsSchema,
            });
            openaiTools.push({
              type: 'web_search_preview',
              search_context_size: args.searchContextSize,
              user_location: args.userLocation,
            });
            break;
          }
          case 'openai.web_search': {
            const args = await validateTypes({
              value: tool.args,
              schema: webSearchArgsSchema,
            });
            openaiTools.push({
              type: 'web_search',
              filters:
                args.filters != null
                  ? { allowed_domains: args.filters.allowedDomains }
                  : undefined,
              external_web_access: args.externalWebAccess,
              search_context_size: args.searchContextSize,
              user_location: args.userLocation,
            });
            break;
          }
          case 'openai.code_interpreter': {
            const args = await validateTypes({
              value: tool.args,
              schema: codeInterpreterArgsSchema,
            });

            openaiTools.push({
              type: 'code_interpreter',
              container:
                args.container == null
                  ? { type: 'auto', file_ids: undefined }
                  : typeof args.container === 'string'
                    ? args.container
                    : { type: 'auto', file_ids: args.container.fileIds },
            });
            break;
          }
          case 'openai.image_generation': {
            const args = await validateTypes({
              value: tool.args,
              schema: imageGenerationArgsSchema,
            });

            openaiTools.push({
              type: 'image_generation',
              background: args.background,
              input_fidelity: args.inputFidelity,
              input_image_mask: args.inputImageMask
                ? {
                    file_id: args.inputImageMask.fileId,
                    image_url: args.inputImageMask.imageUrl,
                  }
                : undefined,
              model: args.model,
              moderation: args.moderation,
              partial_images: args.partialImages,
              quality: args.quality,
              output_compression: args.outputCompression,
              output_format: args.outputFormat,
              size: args.size,
            });
            break;
          }
          case 'openai.mcp': {
            const args = await validateTypes({
              value: tool.args,
              schema: mcpArgsSchema,
            });

            const mapApprovalFilter = (filter: { toolNames?: string[] }) => ({
              tool_names: filter.toolNames,
            });

            const requireApproval = args.requireApproval;
            const requireApprovalParam:
              | 'always'
              | 'never'
              | {
                  never?: { tool_names?: string[] };
                }
              | undefined =
              requireApproval == null
                ? undefined
                : typeof requireApproval === 'string'
                  ? requireApproval
                  : requireApproval.never != null
                    ? { never: mapApprovalFilter(requireApproval.never) }
                    : undefined;

            openaiTools.push({
              type: 'mcp',
              server_label: args.serverLabel,
              allowed_tools: Array.isArray(args.allowedTools)
                ? args.allowedTools
                : args.allowedTools
                  ? {
                      read_only: args.allowedTools.readOnly,
                      tool_names: args.allowedTools.toolNames,
                    }
                  : undefined,
              authorization: args.authorization,
              connector_id: args.connectorId,
              headers: args.headers,
              require_approval: requireApprovalParam ?? 'never',
              server_description: args.serverDescription,
              server_url: args.serverUrl,
            });

            break;
          }
          case 'openai.custom': {
            const args = await validateTypes({
              value: tool.args,
              schema: customArgsSchema,
            });

            openaiTools.push({
              type: 'custom',
              name: args.name,
              description: args.description,
              format: args.format,
            });
            resolvedCustomProviderToolNames.add(args.name);
            break;
          }
          case 'openai.tool_search': {
            const args = await validateTypes({
              value: tool.args,
              schema: toolSearchArgsSchema,
            });
            openaiTools.push({
              type: 'tool_search',
              ...(args.execution != null ? { execution: args.execution } : {}),
              ...(args.description != null
                ? { description: args.description }
                : {}),
              ...(args.parameters != null
                ? { parameters: args.parameters }
                : {}),
            });
            break;
          }
        }
        break;
      }
      default:
        toolWarnings.push({
          type: 'unsupported',
          feature: `function tool ${tool}`,
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
    case 'tool': {
      const resolvedToolName =
        toolNameMapping?.toProviderToolName(toolChoice.toolName) ??
        toolChoice.toolName;

      return {
        tools: openaiTools,
        toolChoice:
          resolvedToolName === 'code_interpreter' ||
          resolvedToolName === 'file_search' ||
          resolvedToolName === 'image_generation' ||
          resolvedToolName === 'web_search_preview' ||
          resolvedToolName === 'web_search' ||
          resolvedToolName === 'mcp' ||
          resolvedToolName === 'apply_patch'
            ? { type: resolvedToolName }
            : resolvedCustomProviderToolNames.has(resolvedToolName)
              ? { type: 'custom', name: resolvedToolName }
              : { type: 'function', name: resolvedToolName },
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

function mapShellEnvironment(environment: {
  type?: string;
  [key: string]: unknown;
}): NonNullable<
  Extract<OpenAIResponsesTool, { type: 'shell' }>['environment']
> {
  if (environment.type === 'containerReference') {
    const env = environment as {
      type: 'containerReference';
      containerId: string;
    };
    return {
      type: 'container_reference',
      container_id: env.containerId,
    };
  }

  if (environment.type === 'containerAuto') {
    const env = environment as {
      type: 'containerAuto';
      fileIds?: string[];
      memoryLimit?: '1g' | '4g' | '16g' | '64g';
      networkPolicy?: {
        type: string;
        allowedDomains?: string[];
        domainSecrets?: Array<{
          domain: string;
          name: string;
          value: string;
        }>;
      };
      skills?: Array<{
        type: string;
        skillId?: string;
        version?: string;
        name?: string;
        description?: string;
        source?: { type: string; mediaType: string; data: string };
      }>;
    };

    return {
      type: 'container_auto',
      file_ids: env.fileIds,
      memory_limit: env.memoryLimit,
      network_policy:
        env.networkPolicy == null
          ? undefined
          : env.networkPolicy.type === 'disabled'
            ? { type: 'disabled' as const }
            : {
                type: 'allowlist' as const,
                allowed_domains: env.networkPolicy.allowedDomains!,
                domain_secrets: env.networkPolicy.domainSecrets,
              },
      skills: mapShellSkills(env.skills),
    };
  }

  const env = environment as {
    type?: 'local';
    skills?: Array<{
      name: string;
      description: string;
      path: string;
    }>;
  };
  return {
    type: 'local',
    skills: env.skills,
  };
}

function mapShellSkills(
  skills:
    | Array<{
        type: string;
        skillId?: string;
        version?: string;
        name?: string;
        description?: string;
        source?: { type: string; mediaType: string; data: string };
      }>
    | undefined,
) {
  return skills?.map(skill =>
    skill.type === 'skillReference'
      ? {
          type: 'skill_reference' as const,
          skill_id: skill.skillId!,
          version: skill.version,
        }
      : {
          type: 'inline' as const,
          name: skill.name!,
          description: skill.description!,
          source: {
            type: 'base64' as const,
            media_type: skill.source!.mediaType as 'application/zip',
            data: skill.source!.data,
          },
        },
  );
}
