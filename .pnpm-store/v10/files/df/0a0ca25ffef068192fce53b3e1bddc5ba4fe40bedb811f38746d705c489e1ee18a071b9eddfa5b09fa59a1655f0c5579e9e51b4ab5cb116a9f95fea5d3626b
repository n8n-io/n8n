import {
  ImageModelV3,
  LanguageModelV3Prompt,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  convertToBase64,
  createJsonResponseHandler,
  FetchFunction,
  generateId as defaultGenerateId,
  type InferSchema,
  lazySchema,
  parseProviderOptions,
  postJsonToApi,
  Resolvable,
  resolve,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { googleFailedResponseHandler } from './google-error';
import {
  GoogleGenerativeAIImageModelId,
  GoogleGenerativeAIImageSettings,
} from './google-generative-ai-image-settings';
import { GoogleGenerativeAILanguageModel } from './google-generative-ai-language-model';
import type { GoogleLanguageModelOptions } from './google-generative-ai-options';

interface GoogleGenerativeAIImageModelConfig {
  provider: string;
  baseURL: string;
  headers?: Resolvable<Record<string, string | undefined>>;
  fetch?: FetchFunction;
  generateId?: () => string;
  _internal?: {
    currentDate?: () => Date;
  };
}

export class GoogleGenerativeAIImageModel implements ImageModelV3 {
  readonly specificationVersion = 'v3';

  get maxImagesPerCall(): number {
    if (this.settings.maxImagesPerCall != null) {
      return this.settings.maxImagesPerCall;
    }
    // https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
    if (isGeminiModel(this.modelId)) {
      return 10;
    }
    // https://ai.google.dev/gemini-api/docs/imagen#imagen-model
    return 4;
  }

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: GoogleGenerativeAIImageModelId,
    private readonly settings: GoogleGenerativeAIImageSettings,
    private readonly config: GoogleGenerativeAIImageModelConfig,
  ) {}

  async doGenerate(
    options: Parameters<ImageModelV3['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>> {
    // Gemini image models use the language model API internally
    if (isGeminiModel(this.modelId)) {
      return this.doGenerateGemini(options);
    }
    return this.doGenerateImagen(options);
  }

  private async doGenerateImagen(
    options: Parameters<ImageModelV3['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>> {
    const {
      prompt,
      n = 1,
      size,
      aspectRatio = '1:1',
      seed,
      providerOptions,
      headers,
      abortSignal,
      files,
      mask,
    } = options;
    const warnings: Array<SharedV3Warning> = [];

    // Imagen API endpoints do not support image editing
    if (files != null && files.length > 0) {
      throw new Error(
        'Google Generative AI does not support image editing with Imagen models. ' +
          'Use Google Vertex AI (@ai-sdk/google-vertex) for image editing capabilities.',
      );
    }

    if (mask != null) {
      throw new Error(
        'Google Generative AI does not support image editing with masks. ' +
          'Use Google Vertex AI (@ai-sdk/google-vertex) for image editing capabilities.',
      );
    }

    if (size != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'size',
        details:
          'This model does not support the `size` option. Use `aspectRatio` instead.',
      });
    }

    if (seed != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'seed',
        details:
          'This model does not support the `seed` option through this provider.',
      });
    }

    const googleOptions = await parseProviderOptions({
      provider: 'google',
      providerOptions,
      schema: googleImageModelOptionsSchema,
    });

    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    const parameters: Record<string, unknown> = {
      sampleCount: n,
    };

    if (aspectRatio != null) {
      parameters.aspectRatio = aspectRatio;
    }

    if (googleOptions) {
      Object.assign(parameters, googleOptions);
    }

    const body = {
      instances: [{ prompt }],
      parameters,
    };

    const { responseHeaders, value: response } = await postJsonToApi<{
      predictions: Array<{ bytesBase64Encoded: string }>;
    }>({
      url: `${this.config.baseURL}/models/${this.modelId}:predict`,
      headers: combineHeaders(await resolve(this.config.headers), headers),
      body,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        googleImageResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });
    return {
      images: response.predictions.map(
        (p: { bytesBase64Encoded: string }) => p.bytesBase64Encoded,
      ),
      warnings,
      providerMetadata: {
        google: {
          images: response.predictions.map(() => ({
            // Add any prediction-specific metadata here
          })),
        },
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
      },
    };
  }

  private async doGenerateGemini(
    options: Parameters<ImageModelV3['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>> {
    const {
      prompt,
      n,
      size,
      aspectRatio,
      seed,
      providerOptions,
      headers,
      abortSignal,
      files,
      mask,
    } = options;
    const warnings: Array<SharedV3Warning> = [];

    // Gemini does not support mask-based inpainting
    if (mask != null) {
      throw new Error(
        'Gemini image models do not support mask-based image editing.',
      );
    }

    // Gemini does not support generating multiple images per call via n parameter
    if (n != null && n > 1) {
      throw new Error(
        'Gemini image models do not support generating a set number of images per call. Use n=1 or omit the n parameter.',
      );
    }

    if (size != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'size',
        details:
          'This model does not support the `size` option. Use `aspectRatio` instead.',
      });
    }

    // Build user message content for language model
    const userContent: Array<
      | { type: 'text'; text: string }
      | { type: 'file'; data: string | Uint8Array | URL; mediaType: string }
    > = [];

    // Add text prompt
    if (prompt != null) {
      userContent.push({ type: 'text', text: prompt });
    }

    // Add input images for editing
    if (files != null && files.length > 0) {
      for (const file of files) {
        if (file.type === 'url') {
          userContent.push({
            type: 'file',
            data: new URL(file.url),
            mediaType: 'image/*',
          });
        } else {
          userContent.push({
            type: 'file',
            data:
              typeof file.data === 'string'
                ? file.data
                : new Uint8Array(file.data),
            mediaType: file.mediaType,
          });
        }
      }
    }

    const languageModelPrompt: LanguageModelV3Prompt = [
      { role: 'user', content: userContent },
    ];

    // Instantiate language model
    const languageModel = new GoogleGenerativeAILanguageModel(this.modelId, {
      provider: this.config.provider,
      baseURL: this.config.baseURL,
      headers: this.config.headers ?? {},
      fetch: this.config.fetch,
      generateId: this.config.generateId ?? defaultGenerateId,
    });

    // Call language model with image-only response modality
    const result = await languageModel.doGenerate({
      prompt: languageModelPrompt,
      seed,
      providerOptions: {
        google: {
          responseModalities: ['IMAGE'],
          imageConfig: aspectRatio
            ? {
                aspectRatio: aspectRatio as NonNullable<
                  GoogleLanguageModelOptions['imageConfig']
                >['aspectRatio'],
              }
            : undefined,
          ...((providerOptions?.google as Omit<
            GoogleLanguageModelOptions,
            'responseModalities' | 'imageConfig'
          >) ?? {}),
        } satisfies GoogleLanguageModelOptions,
      },
      headers,
      abortSignal,
    });

    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    // Extract images from language model response
    const images: string[] = [];
    for (const part of result.content) {
      if (part.type === 'file' && part.mediaType.startsWith('image/')) {
        images.push(convertToBase64(part.data));
      }
    }

    return {
      images,
      warnings,
      providerMetadata: {
        google: {
          images: images.map(() => ({})),
        },
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: result.response?.headers,
      },
      usage: result.usage
        ? {
            inputTokens: result.usage.inputTokens.total,
            outputTokens: result.usage.outputTokens.total,
            totalTokens:
              (result.usage.inputTokens.total ?? 0) +
              (result.usage.outputTokens.total ?? 0),
          }
        : undefined,
    };
  }
}

function isGeminiModel(modelId: string): boolean {
  return modelId.startsWith('gemini-');
}

// minimal version of the schema
const googleImageResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      predictions: z
        .array(z.object({ bytesBase64Encoded: z.string() }))
        .default([]),
    }),
  ),
);

// Note: For the initial GA launch of Imagen 3, safety filters are not configurable.
// https://ai.google.dev/gemini-api/docs/imagen#imagen-model
const googleImageModelOptionsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      personGeneration: z
        .enum(['dont_allow', 'allow_adult', 'allow_all'])
        .nullish(),
      aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']).nullish(),
    }),
  ),
);

export type GoogleImageModelOptions = InferSchema<
  typeof googleImageModelOptionsSchema
>;
