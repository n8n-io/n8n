import type {
  Experimental_VideoModelV3,
  Experimental_VideoModelV3CallOptions,
  Experimental_VideoModelV3File,
  SharedV3ProviderMetadata,
} from '@ai-sdk/provider';
import {
  convertBase64ToUint8Array,
  type DataContent,
  type ProviderOptions,
  withUserAgentSuffix,
} from '@ai-sdk/provider-utils';
import { NoVideoGeneratedError } from '../error/no-video-generated-error';
import {
  DefaultGeneratedFile,
  type GeneratedFile,
} from '../generate-text/generated-file';
import { logWarnings } from '../logger/log-warnings';
import { resolveVideoModel } from '../model/resolve-model';
import type { VideoModel } from '../types/video-model';
import type { VideoModelResponseMetadata } from '../types/video-model-response-metadata';
import type { Warning } from '../types/warning';
import {
  detectMediaType,
  imageMediaTypeSignatures,
  videoMediaTypeSignatures,
} from '../util/detect-media-type';
import { createDownload } from '../util/download/create-download';
import { prepareRetries } from '../util/prepare-retries';
import { VERSION } from '../version';
import type { GenerateVideoResult } from './generate-video-result';
import { splitDataUrl } from '../prompt/split-data-url';

export type GenerateVideoPrompt =
  | string
  | {
      image: DataContent;
      text?: string;
    };

/**
 * Generates videos using a video model.
 *
 * @param model - The video model to use.
 * @param prompt - The prompt that should be used to generate the video.
 * @param n - Number of videos to generate. Default: 1.
 * @param aspectRatio - Aspect ratio of the videos to generate. Must have the format `{width}:{height}`.
 * @param resolution - Resolution of the videos to generate. Must have the format `{width}x{height}`.
 * @param duration - Duration of the video in seconds.
 * @param fps - Frames per second for the video.
 * @param seed - Seed for the video generation.
 * @param providerOptions - Additional provider-specific options that are passed through to the provider
 * as body parameters.
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @returns A result object that contains the generated videos.
 */
const defaultDownload = createDownload();

export async function experimental_generateVideo({
  model: modelArg,
  prompt: promptArg,
  n = 1,
  maxVideosPerCall,
  aspectRatio,
  resolution,
  duration,
  fps,
  seed,
  providerOptions,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  download: downloadFn = defaultDownload,
}: {
  /**
   * The video model to use.
   */
  model: VideoModel;

  /**
   * The prompt that should be used to generate the video.
   */
  prompt: GenerateVideoPrompt;

  /**
   * Number of videos to generate.
   */
  n?: number;

  /**
   * Maximum number of videos per API call. If not provided, the model's default will be used.
   */
  maxVideosPerCall?: number;

  /**
   * Aspect ratio of the videos to generate. Must have the format `{width}:{height}`.
   */
  aspectRatio?: `${number}:${number}`;

  /**
   * Resolution of the videos to generate. Must have the format `{width}x{height}`.
   */
  resolution?: `${number}x${number}`;

  /**
   * Duration of the video in seconds.
   */
  duration?: number;

  /**
   * Frames per second for the video.
   */
  fps?: number;

  /**
   * Seed for the video generation.
   */
  seed?: number;

  /**
   * Additional provider-specific options that are passed through to the provider
   * as body parameters.
   */
  providerOptions?: ProviderOptions;

  /**
   * Maximum number of retries per video model call. Set to 0 to disable retries.
   *
   * @default 2
   */
  maxRetries?: number;

  /**
   * Abort signal.
   */
  abortSignal?: AbortSignal;

  /**
   * Additional headers to include in the request.
   * Only applicable for HTTP-based providers.
   */
  headers?: Record<string, string>;

  /**
   * Custom download function for fetching videos from URLs.
   * Use `createDownload()` from `ai` to create a download function with custom size limits.
   *
   * @default createDownload() (2 GiB limit)
   */
  download?: (options: {
    url: URL;
    abortSignal?: AbortSignal;
  }) => Promise<{ data: Uint8Array; mediaType: string | undefined }>;
}): Promise<GenerateVideoResult> {
  const model = resolveVideoModel(modelArg);

  const headersWithUserAgent = withUserAgentSuffix(
    headers ?? {},
    `ai/${VERSION}`,
  );

  const { retry } = prepareRetries({
    maxRetries: maxRetriesArg,
    abortSignal,
  });

  const { prompt, image } = normalizePrompt(promptArg);

  const maxVideosPerCallWithDefault =
    maxVideosPerCall ?? (await invokeModelMaxVideosPerCall(model)) ?? 1;

  // parallelize calls to the model:
  const callCount = Math.ceil(n / maxVideosPerCallWithDefault);
  const callVideoCounts = Array.from({ length: callCount }, (_, index) => {
    const remaining = n - index * maxVideosPerCallWithDefault;
    return Math.min(remaining, maxVideosPerCallWithDefault);
  });

  const results = await Promise.all(
    callVideoCounts.map(async callVideoCount =>
      retry(() =>
        model.doGenerate({
          prompt,
          n: callVideoCount,
          aspectRatio,
          resolution,
          duration,
          fps,
          seed,
          image,
          providerOptions: providerOptions ?? {},
          headers: headersWithUserAgent,
          abortSignal,
        } satisfies Experimental_VideoModelV3CallOptions),
      ),
    ),
  );

  // collect result videos, warnings, and response metadata
  const videos: Array<GeneratedFile> = [];
  const warnings: Array<Warning> = [];
  const responses: Array<VideoModelResponseMetadata> = [];
  const providerMetadata: SharedV3ProviderMetadata = {};

  for (const result of results) {
    for (const videoData of result.videos) {
      switch (videoData.type) {
        case 'url': {
          const { data, mediaType: downloadedMediaType } = await downloadFn({
            url: new URL(videoData.url),
            abortSignal,
          });

          // Filter out generic/unknown media types that should fall through to detection
          const isUsableMediaType = (type: string | undefined): boolean =>
            !!type && type !== 'application/octet-stream';

          const mediaType =
            (isUsableMediaType(videoData.mediaType) && videoData.mediaType) ||
            (isUsableMediaType(downloadedMediaType) && downloadedMediaType) ||
            detectMediaType({
              data,
              signatures: videoMediaTypeSignatures,
            }) ||
            'video/mp4';

          videos.push(
            new DefaultGeneratedFile({
              data,
              mediaType,
            }),
          );
          break;
        }

        case 'base64': {
          videos.push(
            new DefaultGeneratedFile({
              data: videoData.data,
              mediaType: videoData.mediaType || 'video/mp4',
            }),
          );
          break;
        }

        case 'binary': {
          const mediaType =
            videoData.mediaType ||
            detectMediaType({
              data: videoData.data,
              signatures: videoMediaTypeSignatures,
            }) ||
            'video/mp4';

          videos.push(
            new DefaultGeneratedFile({
              data: videoData.data,
              mediaType,
            }),
          );
          break;
        }
      }
    }

    warnings.push(...result.warnings);

    responses.push({
      timestamp: result.response.timestamp,
      modelId: result.response.modelId,
      headers: result.response.headers,
      providerMetadata: result.providerMetadata,
    });

    if (result.providerMetadata != null) {
      for (const [providerName, metadata] of Object.entries(
        result.providerMetadata,
      )) {
        const existingMetadata = providerMetadata[providerName];
        if (existingMetadata != null && typeof existingMetadata === 'object') {
          providerMetadata[providerName] = {
            ...existingMetadata,
            ...metadata,
          };

          // Merge videos arrays if both exist
          if (
            'videos' in existingMetadata &&
            Array.isArray(existingMetadata.videos) &&
            'videos' in metadata &&
            Array.isArray(metadata.videos)
          ) {
            (providerMetadata[providerName] as { videos: unknown[] }).videos = [
              ...existingMetadata.videos,
              ...metadata.videos,
            ];
          }
        } else {
          providerMetadata[providerName] = metadata;
        }
      }
    }
  }

  if (videos.length === 0) {
    throw new NoVideoGeneratedError({ responses });
  }

  if (warnings.length > 0) {
    logWarnings({
      warnings,
      provider: model.provider,
      model: model.modelId,
    });
  }

  return {
    video: videos[0],
    videos,
    warnings,
    responses,
    providerMetadata,
  };
}

function normalizePrompt(promptArg: GenerateVideoPrompt): {
  prompt: string | undefined;
  image: Experimental_VideoModelV3File | undefined;
} {
  if (typeof promptArg === 'string') {
    return {
      prompt: promptArg,
      image: undefined,
    };
  }

  let image: Experimental_VideoModelV3File | undefined;

  if (promptArg.image != null) {
    const dataContent = promptArg.image;

    if (typeof dataContent === 'string') {
      if (
        dataContent.startsWith('http://') ||
        dataContent.startsWith('https://')
      ) {
        image = {
          type: 'url',
          url: dataContent,
        };
      } else if (dataContent.startsWith('data:')) {
        const { mediaType, base64Content } = splitDataUrl(dataContent);
        image = {
          type: 'file',
          mediaType: mediaType ?? 'image/png',
          data: convertBase64ToUint8Array(base64Content ?? ''),
        };
      } else {
        const bytes = convertBase64ToUint8Array(dataContent);
        const mediaType =
          detectMediaType({
            data: bytes,
            signatures: imageMediaTypeSignatures,
          }) ?? 'image/png';

        image = {
          type: 'file',
          mediaType,
          data: bytes,
        };
      }
    } else if (dataContent instanceof Uint8Array) {
      const mediaType =
        detectMediaType({
          data: dataContent,
          signatures: imageMediaTypeSignatures,
        }) ?? 'image/png';

      image = {
        type: 'file',
        mediaType,
        data: dataContent,
      };
    }
  }

  return {
    prompt: promptArg.text,
    image,
  };
}

async function invokeModelMaxVideosPerCall(model: Experimental_VideoModelV3) {
  if (typeof model.maxVideosPerCall === 'function') {
    return await model.maxVideosPerCall({ modelId: model.modelId });
  }

  return model.maxVideosPerCall;
}
