import {
  ImageModelV3,
  ImageModelV3CallOptions,
  ImageModelV3File,
  ImageModelV3ProviderMetadata,
} from '@ai-sdk/provider';
import {
  convertBase64ToUint8Array,
  DataContent,
  ProviderOptions,
  withUserAgentSuffix,
} from '@ai-sdk/provider-utils';
import { NoImageGeneratedError } from '../error/no-image-generated-error';
import {
  DefaultGeneratedFile,
  GeneratedFile,
} from '../generate-text/generated-file';
import { logWarnings } from '../logger/log-warnings';
import { resolveImageModel } from '../model/resolve-model';
import type { ImageModel } from '../types/image-model';
import { ImageModelResponseMetadata } from '../types/image-model-response-metadata';
import { addImageModelUsage, ImageModelUsage } from '../types/usage';
import { Warning } from '../types/warning';
import {
  detectMediaType,
  imageMediaTypeSignatures,
} from '../util/detect-media-type';
import { prepareRetries } from '../util/prepare-retries';
import { VERSION } from '../version';
import { GenerateImageResult } from './generate-image-result';
import { convertDataContentToUint8Array } from '../prompt/data-content';
import { splitDataUrl } from '../prompt/split-data-url';

export type GenerateImagePrompt =
  | string
  | {
      images: Array<DataContent>;
      text?: string;
      mask?: DataContent;
    };

/**
 * Generates images using an image model.
 *
 * @param model - The image model to use.
 * @param prompt - The prompt that should be used to generate the image.
 * @param n - Number of images to generate. Default: 1.
 * @param maxImagesPerCall - Maximum number of images to generate in a single API call.
 * @param size - Size of the images to generate. Must have the format `{width}x{height}`.
 * @param aspectRatio - Aspect ratio of the images to generate. Must have the format `{width}:{height}`.
 * @param seed - Seed for the image generation.
 * @param providerOptions - Additional provider-specific options that are passed through to the provider
 * as body parameters.
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @returns A result object that contains the generated images.
 */
export async function generateImage({
  model: modelArg,
  prompt: promptArg,
  n = 1,
  maxImagesPerCall,
  size,
  aspectRatio,
  seed,
  providerOptions,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
}: {
  /**
   * The image model to use.
   */
  model: ImageModel;

  /**
   * The prompt that should be used to generate the image.
   */
  prompt: GenerateImagePrompt;

  /**
   * Number of images to generate.
   */
  n?: number;

  /**
   * Maximum number of images to generate in a single API call. If not provided, the model's default will be used.
   */
  maxImagesPerCall?: number;

  /**
   * Size of the images to generate. Must have the format `{width}x{height}`. If not provided, the default size will be used.
   */
  size?: `${number}x${number}`;

  /**
   * Aspect ratio of the images to generate. Must have the format `{width}:{height}`. If not provided, the default aspect ratio will be used.
   */
  aspectRatio?: `${number}:${number}`;

  /**
   * Seed for the image generation. If not provided, the default seed will be used.
   */
  seed?: number;

  /**
   * Additional provider-specific options that are passed through to the provider
   * as body parameters.
   *
   * The outer record is keyed by the provider name, and the inner
   * record is keyed by the provider-specific metadata key.
   * ```ts
   * {
   * "openai": {
   * "style": "vivid"
   * }
   * }
   * ```
   */
  providerOptions?: ProviderOptions;

  /**
   * Maximum number of retries per image model call. Set to 0 to disable retries.
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
}): Promise<GenerateImageResult> {
  const model = resolveImageModel(modelArg);

  const headersWithUserAgent = withUserAgentSuffix(
    headers ?? {},
    `ai/${VERSION}`,
  );

  const { retry } = prepareRetries({
    maxRetries: maxRetriesArg,
    abortSignal,
  });

  // default to 1 if the model has not specified limits on
  // how many images can be generated in a single call
  const maxImagesPerCallWithDefault =
    maxImagesPerCall ?? (await invokeModelMaxImagesPerCall(model)) ?? 1;

  // parallelize calls to the model:
  const callCount = Math.ceil(n / maxImagesPerCallWithDefault);
  const callImageCounts = Array.from({ length: callCount }, (_, i) => {
    if (i < callCount - 1) {
      return maxImagesPerCallWithDefault;
    }

    const remainder = n % maxImagesPerCallWithDefault;
    return remainder === 0 ? maxImagesPerCallWithDefault : remainder;
  });

  const results = await Promise.all(
    callImageCounts.map(async callImageCount =>
      retry(() => {
        const { prompt, files, mask } = normalizePrompt(promptArg);

        return model.doGenerate({
          prompt,
          files,
          mask,
          n: callImageCount,
          abortSignal,
          headers: headersWithUserAgent,
          size,
          aspectRatio,
          seed,
          providerOptions: providerOptions ?? {},
        });
      }),
    ),
  );

  // collect result images, warnings, and response metadata
  const images: Array<DefaultGeneratedFile> = [];
  const warnings: Array<Warning> = [];
  const responses: Array<ImageModelResponseMetadata> = [];
  const providerMetadata: ImageModelV3ProviderMetadata = {};
  let totalUsage: ImageModelUsage = {
    inputTokens: undefined,
    outputTokens: undefined,
    totalTokens: undefined,
  };
  for (const result of results) {
    images.push(
      ...result.images.map(
        image =>
          new DefaultGeneratedFile({
            data: image,
            mediaType:
              detectMediaType({
                data: image,
                signatures: imageMediaTypeSignatures,
              }) ?? 'image/png',
          }),
      ),
    );
    warnings.push(...result.warnings);

    if (result.usage != null) {
      totalUsage = addImageModelUsage(totalUsage, result.usage);
    }

    if (result.providerMetadata) {
      for (const [providerName, metadata] of Object.entries<{
        images: unknown;
      }>(result.providerMetadata)) {
        if (providerName === 'gateway') {
          const currentEntry = providerMetadata[providerName];
          if (currentEntry != null && typeof currentEntry === 'object') {
            providerMetadata[providerName] = {
              ...(currentEntry as object),
              ...metadata,
            } as ImageModelV3ProviderMetadata[string];
          } else {
            providerMetadata[providerName] =
              metadata as ImageModelV3ProviderMetadata[string];
          }
          const imagesValue = (
            providerMetadata[providerName] as { images?: unknown }
          ).images;
          if (Array.isArray(imagesValue) && imagesValue.length === 0) {
            delete (providerMetadata[providerName] as { images?: unknown })
              .images;
          }
        } else {
          providerMetadata[providerName] ??= { images: [] };
          providerMetadata[providerName].images.push(
            ...result.providerMetadata[providerName].images,
          );
        }
      }
    }

    responses.push(result.response);
  }

  logWarnings({ warnings, provider: model.provider, model: model.modelId });

  if (!images.length) {
    throw new NoImageGeneratedError({ responses });
  }

  return new DefaultGenerateImageResult({
    images,
    warnings,
    responses,
    providerMetadata,
    usage: totalUsage,
  });
}

class DefaultGenerateImageResult implements GenerateImageResult {
  readonly images: Array<GeneratedFile>;
  readonly warnings: Array<Warning>;
  readonly responses: Array<ImageModelResponseMetadata>;
  readonly providerMetadata: ImageModelV3ProviderMetadata;
  readonly usage: ImageModelUsage;

  constructor(options: {
    images: Array<GeneratedFile>;
    warnings: Array<Warning>;
    responses: Array<ImageModelResponseMetadata>;
    providerMetadata: ImageModelV3ProviderMetadata;
    usage: ImageModelUsage;
  }) {
    this.images = options.images;
    this.warnings = options.warnings;
    this.responses = options.responses;
    this.providerMetadata = options.providerMetadata;
    this.usage = options.usage;
  }

  get image() {
    return this.images[0];
  }
}

async function invokeModelMaxImagesPerCall(model: ImageModelV3) {
  const isFunction = model.maxImagesPerCall instanceof Function;

  if (!isFunction) {
    return model.maxImagesPerCall;
  }

  return model.maxImagesPerCall({
    modelId: model.modelId,
  });
}

function normalizePrompt(
  prompt: GenerateImagePrompt,
): Pick<ImageModelV3CallOptions, 'prompt' | 'files' | 'mask'> {
  if (typeof prompt === 'string') {
    return { prompt, files: undefined, mask: undefined };
  }

  return {
    prompt: prompt.text,
    files: prompt.images.map(toImageModelV3File),
    mask: prompt.mask ? toImageModelV3File(prompt.mask) : undefined,
  };
}

function toImageModelV3File(dataContent: DataContent): ImageModelV3File {
  if (typeof dataContent === 'string' && dataContent.startsWith('http')) {
    return {
      type: 'url',
      url: dataContent,
    };
  }

  // Handle data URLs
  if (typeof dataContent === 'string' && dataContent.startsWith('data:')) {
    const { mediaType: dataUrlMediaType, base64Content } =
      splitDataUrl(dataContent);

    if (base64Content != null) {
      const uint8Data = convertBase64ToUint8Array(base64Content);
      return {
        type: 'file',
        data: uint8Data,
        mediaType:
          dataUrlMediaType ||
          detectMediaType({
            data: uint8Data,
            signatures: imageMediaTypeSignatures,
          }) ||
          'image/png',
      };
    }
  }

  const uint8Data = convertDataContentToUint8Array(dataContent);
  return {
    type: 'file',
    data: uint8Data,
    mediaType:
      detectMediaType({
        data: uint8Data,
        signatures: imageMediaTypeSignatures,
      }) || 'image/png',
  };
}
