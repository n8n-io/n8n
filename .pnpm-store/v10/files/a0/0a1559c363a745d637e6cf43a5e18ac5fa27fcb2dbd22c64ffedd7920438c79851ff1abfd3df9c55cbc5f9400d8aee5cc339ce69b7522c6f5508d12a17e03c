import { ImageModelV3, SharedV3Warning } from '@ai-sdk/provider';
import {
  combineHeaders,
  convertImageModelFileToDataUri,
  createBinaryResponseHandler,
  createJsonResponseHandler,
  createStatusCodeErrorResponseHandler,
  FetchFunction,
  getFromApi,
  parseProviderOptions,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { xaiFailedResponseHandler } from './xai-error';
import { xaiImageModelOptions } from './xai-image-options';
import { XaiImageModelId } from './xai-image-settings';

interface XaiImageModelConfig {
  provider: string;
  baseURL: string | undefined;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
  };
}

export class XaiImageModel implements ImageModelV3 {
  readonly specificationVersion = 'v3';
  readonly maxImagesPerCall = 3;

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: XaiImageModelId,
    private config: XaiImageModelConfig,
  ) {}

  async doGenerate({
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
  }: Parameters<ImageModelV3['doGenerate']>[0]): Promise<
    Awaited<ReturnType<ImageModelV3['doGenerate']>>
  > {
    const warnings: Array<SharedV3Warning> = [];

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
      });
    }

    if (mask != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'mask',
      });
    }

    const xaiOptions = await parseProviderOptions({
      provider: 'xai',
      providerOptions,
      schema: xaiImageModelOptions,
    });

    const hasFiles = files != null && files.length > 0;
    const imageUrls = hasFiles
      ? files.map(file => convertImageModelFileToDataUri(file))
      : [];

    const endpoint = hasFiles ? '/images/edits' : '/images/generations';

    const body: Record<string, unknown> = {
      model: this.modelId,
      prompt,
      n,
      response_format: 'b64_json',
    };

    if (aspectRatio != null) {
      body.aspect_ratio = aspectRatio;
    }

    if (xaiOptions?.output_format != null) {
      body.output_format = xaiOptions.output_format;
    }

    if (xaiOptions?.sync_mode != null) {
      body.sync_mode = xaiOptions.sync_mode;
    }

    if (xaiOptions?.aspect_ratio != null && aspectRatio == null) {
      body.aspect_ratio = xaiOptions.aspect_ratio;
    }

    if (xaiOptions?.resolution != null) {
      body.resolution = xaiOptions.resolution;
    }

    if (xaiOptions?.quality != null) {
      body.quality = xaiOptions.quality;
    }

    if (xaiOptions?.user != null) {
      body.user = xaiOptions.user;
    }

    if (imageUrls.length === 1) {
      body.image = { url: imageUrls[0], type: 'image_url' };
    } else if (imageUrls.length > 1) {
      body.images = imageUrls.map(url => ({ url, type: 'image_url' }));
    }

    const baseURL = this.config.baseURL ?? 'https://api.x.ai/v1';
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();
    const { value: response, responseHeaders } = await postJsonToApi({
      url: `${baseURL}${endpoint}`,
      headers: combineHeaders(this.config.headers(), headers),
      body,
      failedResponseHandler: xaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        xaiImageResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    const hasAllBase64 = response.data.every(image => image.b64_json != null);

    const images = hasAllBase64
      ? response.data.map(image => image.b64_json!)
      : await Promise.all(
          response.data.map(image =>
            this.downloadImage(image.url!, abortSignal),
          ),
        );

    return {
      images,
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
      },
      providerMetadata: {
        xai: {
          images: response.data.map(item => ({
            ...(item.revised_prompt
              ? { revisedPrompt: item.revised_prompt }
              : {}),
          })),
          ...(response.usage?.cost_in_usd_ticks != null
            ? { costInUsdTicks: response.usage.cost_in_usd_ticks }
            : {}),
        },
      },
    };
  }

  private async downloadImage(
    url: string,
    abortSignal: AbortSignal | undefined,
  ): Promise<Uint8Array> {
    const { value } = await getFromApi({
      url,
      abortSignal,
      failedResponseHandler: createStatusCodeErrorResponseHandler(),
      successfulResponseHandler: createBinaryResponseHandler(),
      fetch: this.config.fetch,
    });
    return value;
  }
}

const xaiImageResponseSchema = z.object({
  data: z.array(
    z.object({
      url: z.string().nullish(),
      b64_json: z.string().nullish(),
      revised_prompt: z.string().nullish(),
    }),
  ),
  usage: z
    .object({
      cost_in_usd_ticks: z.number().nullish(),
    })
    .nullish(),
});
