import {
  ImageModelV3,
  ImageModelV3File,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  convertBase64ToUint8Array,
  convertToFormData,
  createJsonResponseHandler,
  downloadBlob,
  postFormDataToApi,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { OpenAIConfig } from '../openai-config';
import { openaiFailedResponseHandler } from '../openai-error';
import { openaiImageResponseSchema } from './openai-image-api';
import {
  OpenAIImageModelId,
  hasDefaultResponseFormat,
  modelMaxImagesPerCall,
} from './openai-image-options';

interface OpenAIImageModelConfig extends OpenAIConfig {
  _internal?: {
    currentDate?: () => Date;
  };
}

export class OpenAIImageModel implements ImageModelV3 {
  readonly specificationVersion = 'v3';

  get maxImagesPerCall(): number {
    return modelMaxImagesPerCall[this.modelId] ?? 1;
  }

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: OpenAIImageModelId,
    private readonly config: OpenAIImageModelConfig,
  ) {}

  async doGenerate({
    prompt,
    files,
    mask,
    n,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal,
  }: Parameters<ImageModelV3['doGenerate']>[0]): Promise<
    Awaited<ReturnType<ImageModelV3['doGenerate']>>
  > {
    const warnings: Array<SharedV3Warning> = [];

    if (aspectRatio != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'aspectRatio',
        details:
          'This model does not support aspect ratio. Use `size` instead.',
      });
    }

    if (seed != null) {
      warnings.push({ type: 'unsupported', feature: 'seed' });
    }

    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    if (files != null) {
      const { value: response, responseHeaders } = await postFormDataToApi({
        url: this.config.url({
          path: '/images/edits',
          modelId: this.modelId,
        }),
        headers: combineHeaders(this.config.headers(), headers),
        formData: convertToFormData<OpenAIImageEditInput>({
          model: this.modelId,
          prompt,
          image: await Promise.all(
            files.map(file =>
              file.type === 'file'
                ? new Blob(
                    [
                      file.data instanceof Uint8Array
                        ? new Blob([file.data as BlobPart], {
                            type: file.mediaType,
                          })
                        : new Blob([convertBase64ToUint8Array(file.data)], {
                            type: file.mediaType,
                          }),
                    ],
                    { type: file.mediaType },
                  )
                : downloadBlob(file.url),
            ),
          ),
          mask: mask != null ? await fileToBlob(mask) : undefined,
          n,
          size,
          ...(providerOptions.openai ?? {}),
        }),
        failedResponseHandler: openaiFailedResponseHandler,
        successfulResponseHandler: createJsonResponseHandler(
          openaiImageResponseSchema,
        ),
        abortSignal,
        fetch: this.config.fetch,
      });

      return {
        images: response.data.map(item => item.b64_json),
        warnings,
        usage:
          response.usage != null
            ? {
                inputTokens: response.usage.input_tokens ?? undefined,
                outputTokens: response.usage.output_tokens ?? undefined,
                totalTokens: response.usage.total_tokens ?? undefined,
              }
            : undefined,
        response: {
          timestamp: currentDate,
          modelId: this.modelId,
          headers: responseHeaders,
        },
        providerMetadata: {
          openai: {
            images: response.data.map((item, index) => ({
              ...(item.revised_prompt
                ? { revisedPrompt: item.revised_prompt }
                : {}),
              created: response.created ?? undefined,
              size: response.size ?? undefined,
              quality: response.quality ?? undefined,
              background: response.background ?? undefined,
              outputFormat: response.output_format ?? undefined,
              ...distributeTokenDetails(
                response.usage?.input_tokens_details,
                index,
                response.data.length,
              ),
            })),
          },
        },
      };
    }

    const { value: response, responseHeaders } = await postJsonToApi({
      url: this.config.url({
        path: '/images/generations',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        model: this.modelId,
        prompt,
        n,
        size,
        ...(providerOptions.openai ?? {}),
        ...(!hasDefaultResponseFormat(this.modelId)
          ? { response_format: 'b64_json' }
          : {}),
      },
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        openaiImageResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    return {
      images: response.data.map(item => item.b64_json),
      warnings,
      usage:
        response.usage != null
          ? {
              inputTokens: response.usage.input_tokens ?? undefined,
              outputTokens: response.usage.output_tokens ?? undefined,
              totalTokens: response.usage.total_tokens ?? undefined,
            }
          : undefined,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
      },
      providerMetadata: {
        openai: {
          images: response.data.map((item, index) => ({
            ...(item.revised_prompt
              ? { revisedPrompt: item.revised_prompt }
              : {}),
            created: response.created ?? undefined,
            size: response.size ?? undefined,
            quality: response.quality ?? undefined,
            background: response.background ?? undefined,
            outputFormat: response.output_format ?? undefined,
            ...distributeTokenDetails(
              response.usage?.input_tokens_details,
              index,
              response.data.length,
            ),
          })),
        },
      },
    };
  }
}

/**
 * Distributes input token details evenly across images, with the remainder
 * assigned to the last image so that summing across all entries gives the
 * exact total.
 */
function distributeTokenDetails(
  details:
    | { image_tokens?: number | null; text_tokens?: number | null }
    | null
    | undefined,
  index: number,
  total: number,
): { imageTokens?: number; textTokens?: number } {
  if (details == null) {
    return {};
  }

  const result: { imageTokens?: number; textTokens?: number } = {};

  if (details.image_tokens != null) {
    const base = Math.floor(details.image_tokens / total);
    const remainder = details.image_tokens - base * (total - 1);
    result.imageTokens = index === total - 1 ? remainder : base;
  }

  if (details.text_tokens != null) {
    const base = Math.floor(details.text_tokens / total);
    const remainder = details.text_tokens - base * (total - 1);
    result.textTokens = index === total - 1 ? remainder : base;
  }

  return result;
}

type OpenAIImageEditInput = {
  /**
   * Allows to set transparency for the background of the generated image(s).
   * This parameter is only supported for `gpt-image-1`. Must be one of
   * `transparent`, `opaque` or `auto` (default value). When `auto` is used, the
   * model will automatically determine the best background for the image.
   *
   * If `transparent`, the output format needs to support transparency, so it
   * should be set to either `png` (default value) or `webp`.
   *
   */
  background?: 'transparent' | 'opaque' | 'auto';
  /**
   * The image(s) to edit. Must be a supported image file or an array of images.
   *
   * For `gpt-image-1`, each image should be a `png`, `webp`, or `jpg` file less
   * than 50MB. You can provide up to 16 images.
   *
   * For `dall-e-2`, you can only provide one image, and it should be a square
   * `png` file less than 4MB.
   *
   */
  image: Blob | Blob[];
  input_fidelity?: ('high' | 'low') | null;
  /**
   * An additional image whose fully transparent areas (e.g. where alpha is zero) indicate where `image` should be edited. If there are multiple images provided, the mask will be applied on the first image. Must be a valid PNG file, less than 4MB, and have the same dimensions as `image`.
   */
  mask?: Blob;
  /**
   * The model to use for image generation. Only `dall-e-2` and `gpt-image-1` are supported. Defaults to `dall-e-2` unless a parameter specific to `gpt-image-1` is used.
   */
  model?: 'dall-e-2' | 'gpt-image-1' | 'gpt-image-1-mini' | (string & {});
  /**
   * The number of images to generate. Must be between 1 and 10.
   */
  n?: number;
  /**
   * The compression level (0-100%) for the generated images. This parameter
   * is only supported for `gpt-image-1` with the `webp` or `jpeg` output
   * formats, and defaults to 100.
   *
   */
  output_compression?: number;
  /**
   * The format in which the generated images are returned. This parameter is
   * only supported for `gpt-image-1`. Must be one of `png`, `jpeg`, or `webp`.
   * The default value is `png`.
   *
   */
  output_format?: 'png' | 'jpeg' | 'webp';
  partial_images?: number | null;
  /**
   * A text description of the desired image(s). The maximum length is 1000 characters for `dall-e-2`, and 32000 characters for `gpt-image-1`.
   */
  prompt?: string;
  /**
   * The quality of the image that will be generated. `high`, `medium` and `low` are only supported for `gpt-image-1`. `dall-e-2` only supports `standard` quality. Defaults to `auto`.
   *
   */
  quality?: 'standard' | 'low' | 'medium' | 'high' | 'auto';
  /**
   * The format in which the generated images are returned. Must be one of `url` or `b64_json`. URLs are only valid for 60 minutes after the image has been generated. This parameter is only supported for `dall-e-2`, as `gpt-image-1` will always return base64-encoded images.
   */
  response_format?: 'url' | 'b64_json';
  /**
   * The size of the generated images. Must be one of `1024x1024`, `1536x1024` (landscape), `1024x1536` (portrait), or `auto` (default value) for `gpt-image-1`, and one of `256x256`, `512x512`, or `1024x1024` for `dall-e-2`.
   */
  size?: `${number}x${number}`;
  /**
   * Edit the image in streaming mode. Defaults to `false`. See the
   * [Image generation guide](https://platform.openai.com/docs/guides/image-generation) for more information.
   *
   */
  stream?: boolean;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
   *
   */
  user?: string;
};

async function fileToBlob(
  file: ImageModelV3File | undefined,
): Promise<Blob | undefined> {
  if (!file) return undefined;

  if (file.type === 'url') {
    return downloadBlob(file.url);
  }

  const data =
    file.data instanceof Uint8Array
      ? file.data
      : convertBase64ToUint8Array(file.data);

  return new Blob([data as BlobPart], { type: file.mediaType });
}
