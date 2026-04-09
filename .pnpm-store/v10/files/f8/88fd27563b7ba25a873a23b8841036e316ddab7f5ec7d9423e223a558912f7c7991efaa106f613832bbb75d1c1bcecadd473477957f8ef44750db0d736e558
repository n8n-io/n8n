import {
  APICallError,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  FetchFunction,
  parseProviderOptions,
  ParseResult,
  postJsonToApi,
  ResponseHandler,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import {
  defaultOpenAICompatibleErrorStructure,
  ProviderErrorStructure,
} from '../openai-compatible-error';
import { convertOpenAICompatibleCompletionUsage } from './convert-openai-compatible-completion-usage';
import { convertToOpenAICompatibleCompletionPrompt } from './convert-to-openai-compatible-completion-prompt';
import { getResponseMetadata } from './get-response-metadata';
import { mapOpenAICompatibleFinishReason } from './map-openai-compatible-finish-reason';
import {
  OpenAICompatibleCompletionModelId,
  openaiCompatibleLanguageModelCompletionOptions,
} from './openai-compatible-completion-options';

type OpenAICompatibleCompletionConfig = {
  provider: string;
  includeUsage?: boolean;
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: FetchFunction;
  errorStructure?: ProviderErrorStructure<any>;

  /**
   * The supported URLs for the model.
   */
  supportedUrls?: () => LanguageModelV3['supportedUrls'];
};

export class OpenAICompatibleCompletionLanguageModel
  implements LanguageModelV3
{
  readonly specificationVersion = 'v3';

  readonly modelId: OpenAICompatibleCompletionModelId;
  private readonly config: OpenAICompatibleCompletionConfig;
  private readonly failedResponseHandler: ResponseHandler<APICallError>;
  private readonly chunkSchema; // type inferred via constructor

  constructor(
    modelId: OpenAICompatibleCompletionModelId,
    config: OpenAICompatibleCompletionConfig,
  ) {
    this.modelId = modelId;
    this.config = config;

    // initialize error handling:
    const errorStructure =
      config.errorStructure ?? defaultOpenAICompatibleErrorStructure;
    this.chunkSchema = createOpenAICompatibleCompletionChunkSchema(
      errorStructure.errorSchema,
    );
    this.failedResponseHandler = createJsonErrorResponseHandler(errorStructure);
  }

  get provider(): string {
    return this.config.provider;
  }

  private get providerOptionsName(): string {
    return this.config.provider.split('.')[0].trim();
  }

  get supportedUrls() {
    return this.config.supportedUrls?.() ?? {};
  }

  private async getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences: userStopSequences,
    responseFormat,
    seed,
    providerOptions,
    tools,
    toolChoice,
  }: LanguageModelV3CallOptions) {
    const warnings: SharedV3Warning[] = [];

    // Parse provider options
    const completionOptions =
      (await parseProviderOptions({
        provider: this.providerOptionsName,
        providerOptions,
        schema: openaiCompatibleLanguageModelCompletionOptions,
      })) ?? {};

    if (topK != null) {
      warnings.push({ type: 'unsupported', feature: 'topK' });
    }

    if (tools?.length) {
      warnings.push({ type: 'unsupported', feature: 'tools' });
    }

    if (toolChoice != null) {
      warnings.push({ type: 'unsupported', feature: 'toolChoice' });
    }

    if (responseFormat != null && responseFormat.type !== 'text') {
      warnings.push({
        type: 'unsupported',
        feature: 'responseFormat',
        details: 'JSON response format is not supported.',
      });
    }

    const { prompt: completionPrompt, stopSequences } =
      convertToOpenAICompatibleCompletionPrompt({ prompt });

    const stop = [...(stopSequences ?? []), ...(userStopSequences ?? [])];

    return {
      args: {
        // model id:
        model: this.modelId,

        // model specific settings:
        echo: completionOptions.echo,
        logit_bias: completionOptions.logitBias,
        suffix: completionOptions.suffix,
        user: completionOptions.user,

        // standardized settings:
        max_tokens: maxOutputTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        seed,
        ...providerOptions?.[this.providerOptionsName],

        // prompt:
        prompt: completionPrompt,

        // stop sequences:
        stop: stop.length > 0 ? stop : undefined,
      },
      warnings,
    };
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const { args, warnings } = await this.getArgs(options);

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: this.config.url({
        path: '/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        openaiCompatibleCompletionResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const choice = response.choices[0];
    const content: Array<LanguageModelV3Content> = [];

    // text content:
    if (choice.text != null && choice.text.length > 0) {
      content.push({ type: 'text', text: choice.text });
    }

    return {
      content,
      usage: convertOpenAICompatibleCompletionUsage(response.usage),
      finishReason: {
        unified: mapOpenAICompatibleFinishReason(choice.finish_reason),
        raw: choice.finish_reason,
      },
      request: { body: args },
      response: {
        ...getResponseMetadata(response),
        headers: responseHeaders,
        body: rawResponse,
      },
      warnings,
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3StreamResult> {
    const { args, warnings } = await this.getArgs(options);

    const body = {
      ...args,
      stream: true,

      // only include stream_options when in strict compatibility mode:
      stream_options: this.config.includeUsage
        ? { include_usage: true }
        : undefined,
    };

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: '/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: this.failedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        this.chunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    let finishReason: LanguageModelV3FinishReason = {
      unified: 'other',
      raw: undefined,
    };
    let usage:
      | {
          prompt_tokens: number | undefined;
          completion_tokens: number | undefined;
          total_tokens: number | undefined;
        }
      | undefined = undefined;
    let isFirstChunk = true;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof this.chunkSchema>>,
          LanguageModelV3StreamPart
        >({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings });
          },

          transform(chunk, controller) {
            if (options.includeRawChunks) {
              controller.enqueue({ type: 'raw', rawValue: chunk.rawValue });
            }

            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              finishReason = { unified: 'error', raw: undefined };
              controller.enqueue({ type: 'error', error: chunk.error });
              return;
            }

            const value = chunk.value;

            // handle error chunks:
            if ('error' in value) {
              finishReason = { unified: 'error', raw: undefined };
              controller.enqueue({ type: 'error', error: value.error });
              return;
            }

            if (isFirstChunk) {
              isFirstChunk = false;

              controller.enqueue({
                type: 'response-metadata',
                ...getResponseMetadata(value),
              });

              controller.enqueue({
                type: 'text-start',
                id: '0',
              });
            }

            if (value.usage != null) {
              usage = value.usage;
            }

            const choice = value.choices[0];

            if (choice?.finish_reason != null) {
              finishReason = {
                unified: mapOpenAICompatibleFinishReason(choice.finish_reason),
                raw: choice.finish_reason ?? undefined,
              };
            }

            if (choice?.text != null) {
              controller.enqueue({
                type: 'text-delta',
                id: '0',
                delta: choice.text,
              });
            }
          },

          flush(controller) {
            if (!isFirstChunk) {
              controller.enqueue({ type: 'text-end', id: '0' });
            }

            controller.enqueue({
              type: 'finish',
              finishReason,
              usage: convertOpenAICompatibleCompletionUsage(usage),
            });
          },
        }),
      ),
      request: { body },
      response: { headers: responseHeaders },
    };
  }
}

const usageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const openaiCompatibleCompletionResponseSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      text: z.string(),
      finish_reason: z.string(),
    }),
  ),
  usage: usageSchema.nullish(),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const createOpenAICompatibleCompletionChunkSchema = <
  ERROR_SCHEMA extends z.core.$ZodType,
>(
  errorSchema: ERROR_SCHEMA,
) =>
  z.union([
    z.object({
      id: z.string().nullish(),
      created: z.number().nullish(),
      model: z.string().nullish(),
      choices: z.array(
        z.object({
          text: z.string(),
          finish_reason: z.string().nullish(),
          index: z.number(),
        }),
      ),
      usage: usageSchema.nullish(),
    }),
    errorSchema,
  ]);
