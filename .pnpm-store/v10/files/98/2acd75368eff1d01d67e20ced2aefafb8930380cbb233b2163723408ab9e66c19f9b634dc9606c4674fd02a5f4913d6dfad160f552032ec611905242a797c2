import {
  AISDKError,
  type Experimental_VideoModelV3,
  type SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  convertUint8ArrayToBase64,
  createJsonResponseHandler,
  delay,
  type FetchFunction,
  getFromApi,
  lazySchema,
  parseProviderOptions,
  postJsonToApi,
  type Resolvable,
  resolve,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { googleFailedResponseHandler } from './google-error';
import type { GoogleGenerativeAIVideoModelId } from './google-generative-ai-video-settings';

export type GoogleVideoModelOptions = {
  // Polling configuration
  pollIntervalMs?: number | null;
  pollTimeoutMs?: number | null;

  // Video generation options
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all' | null;
  negativePrompt?: string | null;

  // Reference images (for style/asset reference)
  referenceImages?: Array<{
    bytesBase64Encoded?: string;
    gcsUri?: string;
  }> | null;

  [key: string]: unknown; // For passthrough
};

interface GoogleGenerativeAIVideoModelConfig {
  provider: string;
  baseURL: string;
  headers?: Resolvable<Record<string, string | undefined>>;
  fetch?: FetchFunction;
  generateId?: () => string;
  _internal?: {
    currentDate?: () => Date;
  };
}

export class GoogleGenerativeAIVideoModel implements Experimental_VideoModelV3 {
  readonly specificationVersion = 'v3';

  get provider(): string {
    return this.config.provider;
  }

  get maxVideosPerCall(): number {
    // Google supports multiple videos via sampleCount
    return 4;
  }

  constructor(
    readonly modelId: GoogleGenerativeAIVideoModelId,
    private readonly config: GoogleGenerativeAIVideoModelConfig,
  ) {}

  async doGenerate(
    options: Parameters<Experimental_VideoModelV3['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<Experimental_VideoModelV3['doGenerate']>>> {
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();
    const warnings: SharedV3Warning[] = [];

    const googleOptions = (await parseProviderOptions({
      provider: 'google',
      providerOptions: options.providerOptions,
      schema: googleVideoModelOptionsSchema,
    })) as GoogleVideoModelOptions | undefined;

    const instances: Array<Record<string, unknown>> = [{}];
    const instance = instances[0];

    if (options.prompt != null) {
      instance.prompt = options.prompt;
    }

    // Handle image-to-video: convert image to base64
    if (options.image != null) {
      if (options.image.type === 'url') {
        warnings.push({
          type: 'unsupported',
          feature: 'URL-based image input',
          details:
            'Google Generative AI video models require base64-encoded images. URL will be ignored.',
        });
      } else {
        const base64Data =
          typeof options.image.data === 'string'
            ? options.image.data
            : convertUint8ArrayToBase64(options.image.data);

        instance.image = {
          inlineData: {
            mimeType: options.image.mediaType || 'image/png',
            data: base64Data,
          },
        };
      }
    }

    if (googleOptions?.referenceImages != null) {
      instance.referenceImages = googleOptions.referenceImages.map(refImg => {
        if (refImg.bytesBase64Encoded) {
          return {
            inlineData: {
              mimeType: 'image/png',
              data: refImg.bytesBase64Encoded,
            },
          };
        } else if (refImg.gcsUri) {
          return {
            gcsUri: refImg.gcsUri,
          };
        }
        return refImg;
      });
    }

    const parameters: Record<string, unknown> = {
      sampleCount: options.n,
    };

    if (options.aspectRatio) {
      parameters.aspectRatio = options.aspectRatio;
    }

    if (options.resolution) {
      const resolutionMap: Record<string, string> = {
        '1280x720': '720p',
        '1920x1080': '1080p',
        '3840x2160': '4k',
      };
      parameters.resolution =
        resolutionMap[options.resolution] || options.resolution;
    }

    if (options.duration) {
      parameters.durationSeconds = options.duration;
    }

    if (options.seed) {
      parameters.seed = options.seed;
    }

    if (googleOptions != null) {
      const opts = googleOptions as GoogleVideoModelOptions;

      if (
        opts.personGeneration !== undefined &&
        opts.personGeneration !== null
      ) {
        parameters.personGeneration = opts.personGeneration;
      }
      if (opts.negativePrompt !== undefined && opts.negativePrompt !== null) {
        parameters.negativePrompt = opts.negativePrompt;
      }

      for (const [key, value] of Object.entries(opts)) {
        if (
          ![
            'pollIntervalMs',
            'pollTimeoutMs',
            'personGeneration',
            'negativePrompt',
            'referenceImages',
          ].includes(key)
        ) {
          parameters[key] = value;
        }
      }
    }

    const { value: operation } = await postJsonToApi({
      url: `${this.config.baseURL}/models/${this.modelId}:predictLongRunning`,
      headers: combineHeaders(
        await resolve(this.config.headers),
        options.headers,
      ),
      body: {
        instances,
        parameters,
      },
      successfulResponseHandler: createJsonResponseHandler(
        googleOperationSchema,
      ),
      failedResponseHandler: googleFailedResponseHandler,
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const operationName = operation.name;
    if (!operationName) {
      throw new AISDKError({
        name: 'GOOGLE_VIDEO_GENERATION_ERROR',
        message: 'No operation name returned from API',
      });
    }

    const pollIntervalMs = googleOptions?.pollIntervalMs ?? 10000; // 10 seconds (per Google docs)
    const pollTimeoutMs = googleOptions?.pollTimeoutMs ?? 600000; // 10 minutes

    const startTime = Date.now();
    let finalOperation = operation;
    let responseHeaders: Record<string, string> | undefined;

    while (!finalOperation.done) {
      if (Date.now() - startTime > pollTimeoutMs) {
        throw new AISDKError({
          name: 'GOOGLE_VIDEO_GENERATION_TIMEOUT',
          message: `Video generation timed out after ${pollTimeoutMs}ms`,
        });
      }

      await delay(pollIntervalMs);

      if (options.abortSignal?.aborted) {
        throw new AISDKError({
          name: 'GOOGLE_VIDEO_GENERATION_ABORTED',
          message: 'Video generation request was aborted',
        });
      }

      const { value: statusOperation, responseHeaders: pollHeaders } =
        await getFromApi({
          url: `${this.config.baseURL}/${operationName}`,
          headers: combineHeaders(
            await resolve(this.config.headers),
            options.headers,
          ),
          successfulResponseHandler: createJsonResponseHandler(
            googleOperationSchema,
          ),
          failedResponseHandler: googleFailedResponseHandler,
          abortSignal: options.abortSignal,
          fetch: this.config.fetch,
        });

      finalOperation = statusOperation;
      responseHeaders = pollHeaders;
    }

    if (finalOperation.error) {
      throw new AISDKError({
        name: 'GOOGLE_VIDEO_GENERATION_FAILED',
        message: `Video generation failed: ${finalOperation.error.message}`,
      });
    }

    const response = finalOperation.response;
    if (
      !response?.generateVideoResponse?.generatedSamples ||
      response.generateVideoResponse.generatedSamples.length === 0
    ) {
      throw new AISDKError({
        name: 'GOOGLE_VIDEO_GENERATION_ERROR',
        message: `No videos in response. Response: ${JSON.stringify(finalOperation)}`,
      });
    }

    const videos: Array<{ type: 'url'; url: string; mediaType: string }> = [];
    const videoMetadata: Array<{ uri: string }> = [];

    // Get API key from headers to append to download URLs
    const resolvedHeaders = await resolve(this.config.headers);
    const apiKey = resolvedHeaders?.['x-goog-api-key'];

    for (const generatedSample of response.generateVideoResponse
      .generatedSamples) {
      if (generatedSample.video?.uri) {
        // Append API key to URL for authentication during download
        const urlWithAuth = apiKey
          ? `${generatedSample.video.uri}${generatedSample.video.uri.includes('?') ? '&' : '?'}key=${apiKey}`
          : generatedSample.video.uri;

        videos.push({
          type: 'url',
          url: urlWithAuth,
          mediaType: 'video/mp4',
        });
        videoMetadata.push({
          uri: generatedSample.video.uri,
        });
      }
    }

    if (videos.length === 0) {
      throw new AISDKError({
        name: 'GOOGLE_VIDEO_GENERATION_ERROR',
        message: 'No valid videos in response',
      });
    }

    return {
      videos,
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
      },
      providerMetadata: {
        google: {
          videos: videoMetadata,
        },
      },
    };
  }
}

const googleOperationSchema = z.object({
  name: z.string().nullish(),
  done: z.boolean().nullish(),
  error: z
    .object({
      code: z.number().nullish(),
      message: z.string(),
      status: z.string().nullish(),
    })
    .nullish(),
  response: z
    .object({
      generateVideoResponse: z
        .object({
          generatedSamples: z
            .array(
              z.object({
                video: z
                  .object({
                    uri: z.string().nullish(),
                  })
                  .nullish(),
              }),
            )
            .nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

const googleVideoModelOptionsSchema = lazySchema(() =>
  zodSchema(
    z
      .object({
        pollIntervalMs: z.number().positive().nullish(),
        pollTimeoutMs: z.number().positive().nullish(),
        personGeneration: z
          .enum(['dont_allow', 'allow_adult', 'allow_all'])
          .nullish(),
        negativePrompt: z.string().nullish(),
        referenceImages: z
          .array(
            z.object({
              bytesBase64Encoded: z.string().nullish(),
              gcsUri: z.string().nullish(),
            }),
          )
          .nullish(),
      })
      .passthrough(),
  ),
);
