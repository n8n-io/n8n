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
  parseProviderOptions,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { xaiFailedResponseHandler } from './xai-error';
import {
  type XaiVideoModelOptions,
  xaiVideoModelOptionsSchema,
} from './xai-video-options';
import type { XaiVideoModelId } from './xai-video-settings';

interface XaiVideoModelConfig {
  provider: string;
  baseURL: string | undefined;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
  };
}

const RESOLUTION_MAP: Record<string, string> = {
  '1280x720': '720p',
  '854x480': '480p',
  '640x480': '480p',
};

export class XaiVideoModel implements Experimental_VideoModelV3 {
  readonly specificationVersion = 'v3';
  readonly maxVideosPerCall = 1;

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: XaiVideoModelId,
    private config: XaiVideoModelConfig,
  ) {}

  async doGenerate(
    options: Parameters<Experimental_VideoModelV3['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<Experimental_VideoModelV3['doGenerate']>>> {
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();
    const warnings: SharedV3Warning[] = [];

    const xaiOptions = (await parseProviderOptions({
      provider: 'xai',
      providerOptions: options.providerOptions,
      schema: xaiVideoModelOptionsSchema,
    })) as XaiVideoModelOptions | undefined;

    const isEdit = xaiOptions?.videoUrl != null;

    if (options.fps != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'fps',
        details: 'xAI video models do not support custom FPS.',
      });
    }

    if (options.seed != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'seed',
        details: 'xAI video models do not support seed.',
      });
    }

    if (options.n != null && options.n > 1) {
      warnings.push({
        type: 'unsupported',
        feature: 'n',
        details:
          'xAI video models do not support generating multiple videos per call. ' +
          'Only 1 video will be generated.',
      });
    }

    if (isEdit && options.duration != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'duration',
        details: 'xAI video editing does not support custom duration.',
      });
    }

    if (isEdit && options.aspectRatio != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'aspectRatio',
        details: 'xAI video editing does not support custom aspect ratio.',
      });
    }

    if (
      isEdit &&
      (xaiOptions?.resolution != null || options.resolution != null)
    ) {
      warnings.push({
        type: 'unsupported',
        feature: 'resolution',
        details: 'xAI video editing does not support custom resolution.',
      });
    }

    const body: Record<string, unknown> = {
      model: this.modelId,
      prompt: options.prompt,
    };

    if (!isEdit && options.duration != null) {
      body.duration = options.duration;
    }

    if (!isEdit && options.aspectRatio != null) {
      body.aspect_ratio = options.aspectRatio;
    }

    if (!isEdit && xaiOptions?.resolution != null) {
      body.resolution = xaiOptions.resolution;
    } else if (!isEdit && options.resolution != null) {
      const mapped = RESOLUTION_MAP[options.resolution];
      if (mapped != null) {
        body.resolution = mapped;
      } else {
        warnings.push({
          type: 'unsupported',
          feature: 'resolution',
          details:
            `Unrecognized resolution "${options.resolution}". ` +
            'Use providerOptions.xai.resolution with "480p" or "720p" instead.',
        });
      }
    }

    // Video editing: pass source video URL (nested object like image)
    if (xaiOptions?.videoUrl != null) {
      body.video = { url: xaiOptions.videoUrl };
    }

    // Image-to-video: convert SDK image to nested image object
    if (options.image != null) {
      if (options.image.type === 'url') {
        body.image = { url: options.image.url };
      } else {
        const base64Data =
          typeof options.image.data === 'string'
            ? options.image.data
            : convertUint8ArrayToBase64(options.image.data);
        body.image = {
          url: `data:${options.image.mediaType};base64,${base64Data}`,
        };
      }
    }

    if (xaiOptions != null) {
      for (const [key, value] of Object.entries(xaiOptions)) {
        if (
          ![
            'pollIntervalMs',
            'pollTimeoutMs',
            'resolution',
            'videoUrl',
          ].includes(key)
        ) {
          body[key] = value;
        }
      }
    }

    const baseURL = this.config.baseURL ?? 'https://api.x.ai/v1';

    // Step 1: Create video generation/edit request
    const { value: createResponse } = await postJsonToApi({
      url: `${baseURL}/videos/${isEdit ? 'edits' : 'generations'}`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        xaiCreateVideoResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const requestId = createResponse.request_id;
    if (!requestId) {
      throw new AISDKError({
        name: 'XAI_VIDEO_GENERATION_ERROR',
        message: `No request_id returned from xAI API. Response: ${JSON.stringify(createResponse)}`,
      });
    }

    // Step 2: Poll for completion
    const pollIntervalMs = xaiOptions?.pollIntervalMs ?? 5000;
    const pollTimeoutMs = xaiOptions?.pollTimeoutMs ?? 600000;
    const startTime = Date.now();
    let responseHeaders: Record<string, string> | undefined;

    while (true) {
      await delay(pollIntervalMs, { abortSignal: options.abortSignal });

      if (Date.now() - startTime > pollTimeoutMs) {
        throw new AISDKError({
          name: 'XAI_VIDEO_GENERATION_TIMEOUT',
          message: `Video generation timed out after ${pollTimeoutMs}ms`,
        });
      }

      const { value: statusResponse, responseHeaders: pollHeaders } =
        await getFromApi({
          url: `${baseURL}/videos/${requestId}`,
          headers: combineHeaders(this.config.headers(), options.headers),
          successfulResponseHandler: createJsonResponseHandler(
            xaiVideoStatusResponseSchema,
          ),
          failedResponseHandler: xaiFailedResponseHandler,
          abortSignal: options.abortSignal,
          fetch: this.config.fetch,
        });

      responseHeaders = pollHeaders;

      if (
        statusResponse.status === 'done' ||
        (statusResponse.status == null && statusResponse.video?.url)
      ) {
        if (statusResponse.video?.respect_moderation === false) {
          throw new AISDKError({
            name: 'XAI_VIDEO_MODERATION_ERROR',
            message:
              'Video generation was blocked due to a content policy violation.',
          });
        }

        if (!statusResponse.video?.url) {
          throw new AISDKError({
            name: 'XAI_VIDEO_GENERATION_ERROR',
            message:
              'Video generation completed but no video URL was returned.',
          });
        }

        return {
          videos: [
            {
              type: 'url' as const,
              url: statusResponse.video.url,
              mediaType: 'video/mp4',
            },
          ],
          warnings,
          response: {
            timestamp: currentDate,
            modelId: this.modelId,
            headers: responseHeaders,
          },
          providerMetadata: {
            xai: {
              requestId,
              videoUrl: statusResponse.video.url,
              ...(statusResponse.video.duration != null
                ? { duration: statusResponse.video.duration }
                : {}),
              ...(statusResponse.usage?.cost_in_usd_ticks != null
                ? { costInUsdTicks: statusResponse.usage.cost_in_usd_ticks }
                : {}),
            },
          },
        };
      }

      if (statusResponse.status === 'expired') {
        throw new AISDKError({
          name: 'XAI_VIDEO_GENERATION_EXPIRED',
          message: 'Video generation request expired.',
        });
      }

      // 'pending' → continue polling
    }
  }
}

const xaiCreateVideoResponseSchema = z.object({
  request_id: z.string().nullish(),
});

const xaiVideoStatusResponseSchema = z.object({
  status: z.string().nullish(),
  video: z
    .object({
      url: z.string(),
      duration: z.number().nullish(),
      respect_moderation: z.boolean().nullish(),
    })
    .nullish(),
  model: z.string().nullish(),
  usage: z
    .object({
      cost_in_usd_ticks: z.number().nullish(),
    })
    .nullish(),
});
