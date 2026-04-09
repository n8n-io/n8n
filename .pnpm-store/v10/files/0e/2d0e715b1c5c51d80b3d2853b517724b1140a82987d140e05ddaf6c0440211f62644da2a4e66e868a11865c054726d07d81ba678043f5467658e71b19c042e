import {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3Source,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  FetchFunction,
  generateId,
  InferSchema,
  lazySchema,
  parseProviderOptions,
  ParseResult,
  postJsonToApi,
  Resolvable,
  resolve,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import {
  convertGoogleGenerativeAIUsage,
  GoogleGenerativeAIUsageMetadata,
} from './convert-google-generative-ai-usage';
import { convertJSONSchemaToOpenAPISchema } from './convert-json-schema-to-openapi-schema';
import { convertToGoogleGenerativeAIMessages } from './convert-to-google-generative-ai-messages';
import { getModelPath } from './get-model-path';
import { googleFailedResponseHandler } from './google-error';
import {
  GoogleGenerativeAIModelId,
  googleLanguageModelOptions,
} from './google-generative-ai-options';
import {
  GoogleGenerativeAIContentPart,
  GoogleGenerativeAIProviderMetadata,
} from './google-generative-ai-prompt';
import { prepareTools } from './google-prepare-tools';
import { mapGoogleGenerativeAIFinishReason } from './map-google-generative-ai-finish-reason';

type GoogleGenerativeAIConfig = {
  provider: string;
  baseURL: string;
  headers: Resolvable<Record<string, string | undefined>>;
  fetch?: FetchFunction;
  generateId: () => string;

  /**
   * The supported URLs for the model.
   */
  supportedUrls?: () => LanguageModelV3['supportedUrls'];
};

export class GoogleGenerativeAILanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3';

  readonly modelId: GoogleGenerativeAIModelId;

  private readonly config: GoogleGenerativeAIConfig;
  private readonly generateId: () => string;

  constructor(
    modelId: GoogleGenerativeAIModelId,
    config: GoogleGenerativeAIConfig,
  ) {
    this.modelId = modelId;
    this.config = config;
    this.generateId = config.generateId ?? generateId;
  }

  get provider(): string {
    return this.config.provider;
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
    stopSequences,
    responseFormat,
    seed,
    tools,
    toolChoice,
    providerOptions,
  }: LanguageModelV3CallOptions) {
    const warnings: SharedV3Warning[] = [];

    const providerOptionsName = this.config.provider.includes('vertex')
      ? 'vertex'
      : 'google';
    let googleOptions = await parseProviderOptions({
      provider: providerOptionsName,
      providerOptions,
      schema: googleLanguageModelOptions,
    });

    if (googleOptions == null && providerOptionsName !== 'google') {
      googleOptions = await parseProviderOptions({
        provider: 'google',
        providerOptions,
        schema: googleLanguageModelOptions,
      });
    }

    // Add warning if Vertex rag tools are used with a non-Vertex Google provider
    if (
      tools?.some(
        tool =>
          tool.type === 'provider' && tool.id === 'google.vertex_rag_store',
      ) &&
      !this.config.provider.startsWith('google.vertex.')
    ) {
      warnings.push({
        type: 'other',
        message:
          "The 'vertex_rag_store' tool is only supported with the Google Vertex provider " +
          'and might not be supported or could behave unexpectedly with the current Google provider ' +
          `(${this.config.provider}).`,
      });
    }

    const isGemmaModel = this.modelId.toLowerCase().startsWith('gemma-');
    const supportsFunctionResponseParts = this.modelId.startsWith('gemini-3');

    const { contents, systemInstruction } = convertToGoogleGenerativeAIMessages(
      prompt,
      {
        isGemmaModel,
        providerOptionsName,
        supportsFunctionResponseParts,
      },
    );

    const {
      tools: googleTools,
      toolConfig: googleToolConfig,
      toolWarnings,
    } = prepareTools({
      tools,
      toolChoice,
      modelId: this.modelId,
    });

    return {
      args: {
        generationConfig: {
          // standardized settings:
          maxOutputTokens,
          temperature,
          topK,
          topP,
          frequencyPenalty,
          presencePenalty,
          stopSequences,
          seed,

          // response format:
          responseMimeType:
            responseFormat?.type === 'json' ? 'application/json' : undefined,
          responseSchema:
            responseFormat?.type === 'json' &&
            responseFormat.schema != null &&
            // Google GenAI does not support all OpenAPI Schema features,
            // so this is needed as an escape hatch:
            // TODO convert into provider option
            (googleOptions?.structuredOutputs ?? true)
              ? convertJSONSchemaToOpenAPISchema(responseFormat.schema)
              : undefined,
          ...(googleOptions?.audioTimestamp && {
            audioTimestamp: googleOptions.audioTimestamp,
          }),

          // provider options:
          responseModalities: googleOptions?.responseModalities,
          thinkingConfig: googleOptions?.thinkingConfig,
          ...(googleOptions?.mediaResolution && {
            mediaResolution: googleOptions.mediaResolution,
          }),
          ...(googleOptions?.imageConfig && {
            imageConfig: googleOptions.imageConfig,
          }),
        },
        contents,
        systemInstruction: isGemmaModel ? undefined : systemInstruction,
        safetySettings: googleOptions?.safetySettings,
        tools: googleTools,
        toolConfig: googleOptions?.retrievalConfig
          ? {
              ...googleToolConfig,
              retrievalConfig: googleOptions.retrievalConfig,
            }
          : googleToolConfig,
        cachedContent: googleOptions?.cachedContent,
        labels: googleOptions?.labels,
      },
      warnings: [...warnings, ...toolWarnings],
      providerOptionsName,
    };
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const { args, warnings, providerOptionsName } = await this.getArgs(options);

    const mergedHeaders = combineHeaders(
      await resolve(this.config.headers),
      options.headers,
    );

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: `${this.config.baseURL}/${getModelPath(
        this.modelId,
      )}:generateContent`,
      headers: mergedHeaders,
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(responseSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const candidate = response.candidates[0];
    const content: Array<LanguageModelV3Content> = [];

    // map ordered parts to content:
    const parts = candidate.content?.parts ?? [];

    const usageMetadata = response.usageMetadata;

    // Associates a code execution result with its preceding call.
    let lastCodeExecutionToolCallId: string | undefined;

    // Build content array from all parts
    for (const part of parts) {
      if ('executableCode' in part && part.executableCode?.code) {
        const toolCallId = this.config.generateId();
        lastCodeExecutionToolCallId = toolCallId;

        content.push({
          type: 'tool-call',
          toolCallId,
          toolName: 'code_execution',
          input: JSON.stringify(part.executableCode),
          providerExecuted: true,
        });
      } else if ('codeExecutionResult' in part && part.codeExecutionResult) {
        content.push({
          type: 'tool-result',
          // Assumes a result directly follows its corresponding call part.
          toolCallId: lastCodeExecutionToolCallId!,
          toolName: 'code_execution',
          result: {
            outcome: part.codeExecutionResult.outcome,
            output: part.codeExecutionResult.output ?? '',
          },
        });
        // Clear the ID after use to avoid accidental reuse.
        lastCodeExecutionToolCallId = undefined;
      } else if ('text' in part && part.text != null) {
        const thoughtSignatureMetadata = part.thoughtSignature
          ? {
              [providerOptionsName]: {
                thoughtSignature: part.thoughtSignature,
              },
            }
          : undefined;

        if (part.text.length === 0) {
          if (thoughtSignatureMetadata != null && content.length > 0) {
            const lastContent = content[content.length - 1];
            lastContent.providerMetadata = thoughtSignatureMetadata;
          }
        } else {
          content.push({
            type: part.thought === true ? 'reasoning' : 'text',
            text: part.text,
            providerMetadata: thoughtSignatureMetadata,
          });
        }
      } else if ('functionCall' in part) {
        content.push({
          type: 'tool-call' as const,
          toolCallId: this.config.generateId(),
          toolName: part.functionCall.name,
          input: JSON.stringify(part.functionCall.args),
          providerMetadata: part.thoughtSignature
            ? {
                [providerOptionsName]: {
                  thoughtSignature: part.thoughtSignature,
                },
              }
            : undefined,
        });
      } else if ('inlineData' in part) {
        const hasThought = part.thought === true;
        const hasThoughtSignature = !!part.thoughtSignature;
        content.push({
          type: 'file' as const,
          data: part.inlineData.data,
          mediaType: part.inlineData.mimeType,
          providerMetadata:
            hasThought || hasThoughtSignature
              ? {
                  [providerOptionsName]: {
                    ...(hasThought ? { thought: true } : {}),
                    ...(hasThoughtSignature
                      ? { thoughtSignature: part.thoughtSignature }
                      : {}),
                  },
                }
              : undefined,
        });
      }
    }

    const sources =
      extractSources({
        groundingMetadata: candidate.groundingMetadata,
        generateId: this.config.generateId,
      }) ?? [];
    for (const source of sources) {
      content.push(source);
    }

    return {
      content,
      finishReason: {
        unified: mapGoogleGenerativeAIFinishReason({
          finishReason: candidate.finishReason,
          // Only count client-executed tool calls for finish reason determination.
          hasToolCalls: content.some(
            part => part.type === 'tool-call' && !part.providerExecuted,
          ),
        }),
        raw: candidate.finishReason ?? undefined,
      },
      usage: convertGoogleGenerativeAIUsage(usageMetadata),
      warnings,
      providerMetadata: {
        [providerOptionsName]: {
          promptFeedback: response.promptFeedback ?? null,
          groundingMetadata: candidate.groundingMetadata ?? null,
          urlContextMetadata: candidate.urlContextMetadata ?? null,
          safetyRatings: candidate.safetyRatings ?? null,
          usageMetadata: usageMetadata ?? null,
          finishMessage: candidate.finishMessage ?? null,
        } satisfies GoogleGenerativeAIProviderMetadata,
      },
      request: { body: args },
      response: {
        // TODO timestamp, model id, id
        headers: responseHeaders,
        body: rawResponse,
      },
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3StreamResult> {
    const { args, warnings, providerOptionsName } = await this.getArgs(options);

    const headers = combineHeaders(
      await resolve(this.config.headers),
      options.headers,
    );

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/${getModelPath(
        this.modelId,
      )}:streamGenerateContent?alt=sse`,
      headers,
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(chunkSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    let finishReason: LanguageModelV3FinishReason = {
      unified: 'other',
      raw: undefined,
    };
    let usage: GoogleGenerativeAIUsageMetadata | undefined = undefined;
    let providerMetadata: SharedV3ProviderMetadata | undefined = undefined;
    let lastGroundingMetadata: GroundingMetadataSchema | null = null;
    let lastUrlContextMetadata: UrlContextMetadataSchema | null = null;

    const generateId = this.config.generateId;
    let hasToolCalls = false;

    // Track active blocks to group consecutive parts of same type
    let currentTextBlockId: string | null = null;
    let currentReasoningBlockId: string | null = null;
    let blockCounter = 0;

    // Track emitted sources to prevent duplicates
    const emittedSourceUrls = new Set<string>();
    // Associates a code execution result with its preceding call.
    let lastCodeExecutionToolCallId: string | undefined;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<ChunkSchema>,
          LanguageModelV3StreamPart
        >({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings });
          },

          transform(chunk, controller) {
            if (options.includeRawChunks) {
              controller.enqueue({ type: 'raw', rawValue: chunk.rawValue });
            }

            if (!chunk.success) {
              controller.enqueue({ type: 'error', error: chunk.error });
              return;
            }

            const value = chunk.value;

            const usageMetadata = value.usageMetadata;

            if (usageMetadata != null) {
              usage = usageMetadata;
            }

            const candidate = value.candidates?.[0];

            // sometimes the API returns an empty candidates array
            if (candidate == null) {
              return;
            }

            const content = candidate.content;

            if (candidate.groundingMetadata != null) {
              lastGroundingMetadata = candidate.groundingMetadata;
            }
            if (candidate.urlContextMetadata != null) {
              lastUrlContextMetadata = candidate.urlContextMetadata;
            }

            const sources = extractSources({
              groundingMetadata: candidate.groundingMetadata,
              generateId,
            });
            if (sources != null) {
              for (const source of sources) {
                if (
                  source.sourceType === 'url' &&
                  !emittedSourceUrls.has(source.url)
                ) {
                  emittedSourceUrls.add(source.url);
                  controller.enqueue(source);
                }
              }
            }

            // Process tool call's parts before determining finishReason to ensure hasToolCalls is properly set
            if (content != null) {
              // Process all parts in a single loop to preserve original order
              const parts = content.parts ?? [];
              for (const part of parts) {
                if ('executableCode' in part && part.executableCode?.code) {
                  const toolCallId = generateId();
                  lastCodeExecutionToolCallId = toolCallId;

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId,
                    toolName: 'code_execution',
                    input: JSON.stringify(part.executableCode),
                    providerExecuted: true,
                  });
                } else if (
                  'codeExecutionResult' in part &&
                  part.codeExecutionResult
                ) {
                  // Assumes a result directly follows its corresponding call part.
                  const toolCallId = lastCodeExecutionToolCallId;

                  if (toolCallId) {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId,
                      toolName: 'code_execution',
                      result: {
                        outcome: part.codeExecutionResult.outcome,
                        output: part.codeExecutionResult.output ?? '',
                      },
                    });
                    // Clear the ID after use.
                    lastCodeExecutionToolCallId = undefined;
                  }
                } else if ('text' in part && part.text != null) {
                  const thoughtSignatureMetadata = part.thoughtSignature
                    ? {
                        [providerOptionsName]: {
                          thoughtSignature: part.thoughtSignature,
                        },
                      }
                    : undefined;

                  if (part.text.length === 0) {
                    if (
                      thoughtSignatureMetadata != null &&
                      currentTextBlockId !== null
                    ) {
                      controller.enqueue({
                        type: 'text-delta',
                        id: currentTextBlockId,
                        delta: '',
                        providerMetadata: thoughtSignatureMetadata,
                      });
                    }
                  } else if (part.thought === true) {
                    // End any active text block before starting reasoning
                    if (currentTextBlockId !== null) {
                      controller.enqueue({
                        type: 'text-end',
                        id: currentTextBlockId,
                      });
                      currentTextBlockId = null;
                    }

                    // Start new reasoning block if not already active
                    if (currentReasoningBlockId === null) {
                      currentReasoningBlockId = String(blockCounter++);
                      controller.enqueue({
                        type: 'reasoning-start',
                        id: currentReasoningBlockId,
                        providerMetadata: thoughtSignatureMetadata,
                      });
                    }

                    controller.enqueue({
                      type: 'reasoning-delta',
                      id: currentReasoningBlockId,
                      delta: part.text,
                      providerMetadata: thoughtSignatureMetadata,
                    });
                  } else {
                    if (currentReasoningBlockId !== null) {
                      controller.enqueue({
                        type: 'reasoning-end',
                        id: currentReasoningBlockId,
                      });
                      currentReasoningBlockId = null;
                    }

                    if (currentTextBlockId === null) {
                      currentTextBlockId = String(blockCounter++);
                      controller.enqueue({
                        type: 'text-start',
                        id: currentTextBlockId,
                        providerMetadata: thoughtSignatureMetadata,
                      });
                    }

                    controller.enqueue({
                      type: 'text-delta',
                      id: currentTextBlockId,
                      delta: part.text,
                      providerMetadata: thoughtSignatureMetadata,
                    });
                  }
                } else if ('inlineData' in part) {
                  // End any active text or reasoning block before starting file output.
                  // Relevant for multimodal output models.
                  if (currentTextBlockId !== null) {
                    controller.enqueue({
                      type: 'text-end',
                      id: currentTextBlockId,
                    });
                    currentTextBlockId = null;
                  }
                  if (currentReasoningBlockId !== null) {
                    controller.enqueue({
                      type: 'reasoning-end',
                      id: currentReasoningBlockId,
                    });
                    currentReasoningBlockId = null;
                  }

                  const hasThought = part.thought === true;
                  const hasThoughtSignature = !!part.thoughtSignature;
                  const fileMeta =
                    hasThought || hasThoughtSignature
                      ? {
                          [providerOptionsName]: {
                            ...(hasThought ? { thought: true } : {}),
                            ...(hasThoughtSignature
                              ? { thoughtSignature: part.thoughtSignature }
                              : {}),
                          },
                        }
                      : undefined;
                  controller.enqueue({
                    type: 'file',
                    mediaType: part.inlineData.mimeType,
                    data: part.inlineData.data,
                    providerMetadata: fileMeta,
                  });
                }
              }

              const toolCallDeltas = getToolCallsFromParts({
                parts: content.parts,
                generateId,
                providerOptionsName,
              });

              if (toolCallDeltas != null) {
                for (const toolCall of toolCallDeltas) {
                  controller.enqueue({
                    type: 'tool-input-start',
                    id: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    providerMetadata: toolCall.providerMetadata,
                  });

                  controller.enqueue({
                    type: 'tool-input-delta',
                    id: toolCall.toolCallId,
                    delta: toolCall.args,
                    providerMetadata: toolCall.providerMetadata,
                  });

                  controller.enqueue({
                    type: 'tool-input-end',
                    id: toolCall.toolCallId,
                    providerMetadata: toolCall.providerMetadata,
                  });

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    input: toolCall.args,
                    providerMetadata: toolCall.providerMetadata,
                  });

                  hasToolCalls = true;
                }
              }
            }

            if (candidate.finishReason != null) {
              finishReason = {
                unified: mapGoogleGenerativeAIFinishReason({
                  finishReason: candidate.finishReason,
                  hasToolCalls,
                }),
                raw: candidate.finishReason,
              };

              providerMetadata = {
                [providerOptionsName]: {
                  promptFeedback: value.promptFeedback ?? null,
                  groundingMetadata: lastGroundingMetadata,
                  urlContextMetadata: lastUrlContextMetadata,
                  safetyRatings: candidate.safetyRatings ?? null,
                  usageMetadata: usageMetadata ?? null,
                  finishMessage: candidate.finishMessage ?? null,
                } satisfies GoogleGenerativeAIProviderMetadata,
              };
            }
          },

          flush(controller) {
            if (currentTextBlockId !== null) {
              controller.enqueue({
                type: 'text-end',
                id: currentTextBlockId,
              });
            }
            if (currentReasoningBlockId !== null) {
              controller.enqueue({
                type: 'reasoning-end',
                id: currentReasoningBlockId,
              });
            }

            controller.enqueue({
              type: 'finish',
              finishReason,
              usage: convertGoogleGenerativeAIUsage(usage),
              providerMetadata,
            });
          },
        }),
      ),
      response: { headers: responseHeaders },
      request: { body: args },
    };
  }
}

function getToolCallsFromParts({
  parts,
  generateId,
  providerOptionsName,
}: {
  parts: ContentSchema['parts'];
  generateId: () => string;
  providerOptionsName: string;
}) {
  const functionCallParts = parts?.filter(
    part => 'functionCall' in part,
  ) as Array<
    GoogleGenerativeAIContentPart & {
      functionCall: { name: string; args: unknown };
      thoughtSignature?: string | null;
    }
  >;

  return functionCallParts == null || functionCallParts.length === 0
    ? undefined
    : functionCallParts.map(part => ({
        type: 'tool-call' as const,
        toolCallId: generateId(),
        toolName: part.functionCall.name,
        args: JSON.stringify(part.functionCall.args),
        providerMetadata: part.thoughtSignature
          ? {
              [providerOptionsName]: {
                thoughtSignature: part.thoughtSignature,
              },
            }
          : undefined,
      }));
}

function extractSources({
  groundingMetadata,
  generateId,
}: {
  groundingMetadata: GroundingMetadataSchema | undefined | null;
  generateId: () => string;
}): undefined | LanguageModelV3Source[] {
  if (!groundingMetadata?.groundingChunks) {
    return undefined;
  }

  const sources: LanguageModelV3Source[] = [];

  for (const chunk of groundingMetadata.groundingChunks) {
    if (chunk.web != null) {
      // Handle web chunks as URL sources
      sources.push({
        type: 'source',
        sourceType: 'url',
        id: generateId(),
        url: chunk.web.uri,
        title: chunk.web.title ?? undefined,
      });
    } else if (chunk.image != null) {
      // Handle image chunks as image sources
      sources.push({
        type: 'source',
        sourceType: 'url',
        id: generateId(),
        // Google requires attribution to the source URI, not the actual image URI.
        // TODO: add another type in v7 to allow both the image and source URL to be included separately
        url: chunk.image.sourceUri,
        title: chunk.image.title ?? undefined,
      });
    } else if (chunk.retrievedContext != null) {
      // Handle retrievedContext chunks from RAG operations
      const uri = chunk.retrievedContext.uri;
      const fileSearchStore = chunk.retrievedContext.fileSearchStore;

      if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
        // Old format: Google Search with HTTP/HTTPS URL
        sources.push({
          type: 'source',
          sourceType: 'url',
          id: generateId(),
          url: uri,
          title: chunk.retrievedContext.title ?? undefined,
        });
      } else if (uri) {
        // Old format: Document with file path (gs://, etc.)
        const title = chunk.retrievedContext.title ?? 'Unknown Document';
        let mediaType = 'application/octet-stream';
        let filename: string | undefined = undefined;

        if (uri.endsWith('.pdf')) {
          mediaType = 'application/pdf';
          filename = uri.split('/').pop();
        } else if (uri.endsWith('.txt')) {
          mediaType = 'text/plain';
          filename = uri.split('/').pop();
        } else if (uri.endsWith('.docx')) {
          mediaType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          filename = uri.split('/').pop();
        } else if (uri.endsWith('.doc')) {
          mediaType = 'application/msword';
          filename = uri.split('/').pop();
        } else if (uri.match(/\.(md|markdown)$/)) {
          mediaType = 'text/markdown';
          filename = uri.split('/').pop();
        } else {
          filename = uri.split('/').pop();
        }

        sources.push({
          type: 'source',
          sourceType: 'document',
          id: generateId(),
          mediaType,
          title,
          filename,
        });
      } else if (fileSearchStore) {
        // New format: File Search with fileSearchStore (no uri)
        const title = chunk.retrievedContext.title ?? 'Unknown Document';
        sources.push({
          type: 'source',
          sourceType: 'document',
          id: generateId(),
          mediaType: 'application/octet-stream',
          title,
          filename: fileSearchStore.split('/').pop(),
        });
      }
    } else if (chunk.maps != null) {
      if (chunk.maps.uri) {
        sources.push({
          type: 'source',
          sourceType: 'url',
          id: generateId(),
          url: chunk.maps.uri,
          title: chunk.maps.title ?? undefined,
        });
      }
    }
  }

  return sources.length > 0 ? sources : undefined;
}

export const getGroundingMetadataSchema = () =>
  z.object({
    webSearchQueries: z.array(z.string()).nullish(),
    imageSearchQueries: z.array(z.string()).nullish(),
    retrievalQueries: z.array(z.string()).nullish(),
    searchEntryPoint: z.object({ renderedContent: z.string() }).nullish(),
    groundingChunks: z
      .array(
        z.object({
          web: z
            .object({ uri: z.string(), title: z.string().nullish() })
            .nullish(),
          image: z
            .object({
              sourceUri: z.string(),
              imageUri: z.string(),
              title: z.string().nullish(),
              domain: z.string().nullish(),
            })
            .nullish(),
          retrievedContext: z
            .object({
              uri: z.string().nullish(),
              title: z.string().nullish(),
              text: z.string().nullish(),
              fileSearchStore: z.string().nullish(),
            })
            .nullish(),
          maps: z
            .object({
              uri: z.string().nullish(),
              title: z.string().nullish(),
              text: z.string().nullish(),
              placeId: z.string().nullish(),
            })
            .nullish(),
        }),
      )
      .nullish(),
    groundingSupports: z
      .array(
        z.object({
          segment: z
            .object({
              startIndex: z.number().nullish(),
              endIndex: z.number().nullish(),
              text: z.string().nullish(),
            })
            .nullish(),
          segment_text: z.string().nullish(),
          groundingChunkIndices: z.array(z.number()).nullish(),
          supportChunkIndices: z.array(z.number()).nullish(),
          confidenceScores: z.array(z.number()).nullish(),
          confidenceScore: z.array(z.number()).nullish(),
        }),
      )
      .nullish(),
    retrievalMetadata: z
      .union([
        z.object({
          webDynamicRetrievalScore: z.number(),
        }),
        z.object({}),
      ])
      .nullish(),
  });

const getContentSchema = () =>
  z.object({
    parts: z
      .array(
        z.union([
          // note: order matters since text can be fully empty
          z.object({
            functionCall: z.object({
              name: z.string(),
              args: z.unknown(),
            }),
            thoughtSignature: z.string().nullish(),
          }),
          z.object({
            inlineData: z.object({
              mimeType: z.string(),
              data: z.string(),
            }),
            thought: z.boolean().nullish(),
            thoughtSignature: z.string().nullish(),
          }),
          z.object({
            executableCode: z
              .object({
                language: z.string(),
                code: z.string(),
              })
              .nullish(),
            codeExecutionResult: z
              .object({
                outcome: z.string(),
                output: z.string().nullish(),
              })
              .nullish(),
            text: z.string().nullish(),
            thought: z.boolean().nullish(),
            thoughtSignature: z.string().nullish(),
          }),
        ]),
      )
      .nullish(),
  });

// https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters
const getSafetyRatingSchema = () =>
  z.object({
    category: z.string().nullish(),
    probability: z.string().nullish(),
    probabilityScore: z.number().nullish(),
    severity: z.string().nullish(),
    severityScore: z.number().nullish(),
    blocked: z.boolean().nullish(),
  });

const usageSchema = z.object({
  cachedContentTokenCount: z.number().nullish(),
  thoughtsTokenCount: z.number().nullish(),
  promptTokenCount: z.number().nullish(),
  candidatesTokenCount: z.number().nullish(),
  totalTokenCount: z.number().nullish(),
  // https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse#TrafficType
  trafficType: z.string().nullish(),
});

// https://ai.google.dev/api/generate-content#UrlRetrievalMetadata
export const getUrlContextMetadataSchema = () =>
  z.object({
    urlMetadata: z
      .array(
        z.object({
          retrievedUrl: z.string(),
          urlRetrievalStatus: z.string(),
        }),
      )
      .nullish(),
  });

const responseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      candidates: z.array(
        z.object({
          content: getContentSchema().nullish().or(z.object({}).strict()),
          finishReason: z.string().nullish(),
          finishMessage: z.string().nullish(),
          safetyRatings: z.array(getSafetyRatingSchema()).nullish(),
          groundingMetadata: getGroundingMetadataSchema().nullish(),
          urlContextMetadata: getUrlContextMetadataSchema().nullish(),
        }),
      ),
      usageMetadata: usageSchema.nullish(),
      promptFeedback: z
        .object({
          blockReason: z.string().nullish(),
          safetyRatings: z.array(getSafetyRatingSchema()).nullish(),
        })
        .nullish(),
    }),
  ),
);

type ContentSchema = NonNullable<
  InferSchema<typeof responseSchema>['candidates'][number]['content']
>;
export type GroundingMetadataSchema = NonNullable<
  InferSchema<typeof responseSchema>['candidates'][number]['groundingMetadata']
>;

type GroundingChunkSchema = NonNullable<
  GroundingMetadataSchema['groundingChunks']
>[number];

export type UrlContextMetadataSchema = NonNullable<
  InferSchema<typeof responseSchema>['candidates'][number]['urlContextMetadata']
>;

export type SafetyRatingSchema = NonNullable<
  InferSchema<typeof responseSchema>['candidates'][number]['safetyRatings']
>[number];

export type PromptFeedbackSchema = NonNullable<
  InferSchema<typeof responseSchema>['promptFeedback']
>;

export type UsageMetadataSchema = NonNullable<
  InferSchema<typeof responseSchema>['usageMetadata']
>;

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const chunkSchema = lazySchema(() =>
  zodSchema(
    z.object({
      candidates: z
        .array(
          z.object({
            content: getContentSchema().nullish(),
            finishReason: z.string().nullish(),
            finishMessage: z.string().nullish(),
            safetyRatings: z.array(getSafetyRatingSchema()).nullish(),
            groundingMetadata: getGroundingMetadataSchema().nullish(),
            urlContextMetadata: getUrlContextMetadataSchema().nullish(),
          }),
        )
        .nullish(),
      usageMetadata: usageSchema.nullish(),
      promptFeedback: z
        .object({
          blockReason: z.string().nullish(),
          safetyRatings: z.array(getSafetyRatingSchema()).nullish(),
        })
        .nullish(),
    }),
  ),
);

type ChunkSchema = InferSchema<typeof chunkSchema>;
