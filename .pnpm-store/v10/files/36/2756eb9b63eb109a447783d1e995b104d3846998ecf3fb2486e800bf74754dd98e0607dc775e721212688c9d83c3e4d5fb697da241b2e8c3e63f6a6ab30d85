import { ImageModelV3, ImageModelV3CallOptions } from '@ai-sdk/provider';
import { ImageModelMiddleware } from '../types';
import { asArray } from '../util/as-array';

/**
 * Wraps an ImageModelV3 instance with middleware functionality.
 * This function allows you to apply middleware to transform parameters
 * and wrap generate operations of an image model.
 *
 * @param options - Configuration options for wrapping the image model.
 * @param options.model - The original ImageModelV3 instance to be wrapped.
 * @param options.middleware - The middleware to be applied to the image model. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.modelId - Optional custom model ID to override the original model's ID.
 * @param options.providerId - Optional custom provider ID to override the original model's provider ID.
 * @returns A new ImageModelV3 instance with middleware applied.
 */
export const wrapImageModel = ({
  model,
  middleware: middlewareArg,
  modelId,
  providerId,
}: {
  model: ImageModelV3;
  middleware: ImageModelMiddleware | ImageModelMiddleware[];
  modelId?: string;
  providerId?: string;
}): ImageModelV3 => {
  return [...asArray(middlewareArg)]
    .reverse()
    .reduce((wrappedModel, middleware) => {
      return doWrap({ model: wrappedModel, middleware, modelId, providerId });
    }, model);
};

const doWrap = ({
  model,
  middleware: {
    transformParams,
    wrapGenerate,
    overrideProvider,
    overrideModelId,
    overrideMaxImagesPerCall,
  },
  modelId,
  providerId,
}: {
  model: ImageModelV3;
  middleware: ImageModelMiddleware;
  modelId?: string;
  providerId?: string;
}): ImageModelV3 => {
  async function doTransform({ params }: { params: ImageModelV3CallOptions }) {
    return transformParams ? await transformParams({ params, model }) : params;
  }

  const maxImagesPerCallRaw =
    overrideMaxImagesPerCall?.({ model }) ?? model.maxImagesPerCall;

  // Ensure provider implementations that rely on `this` inside `maxImagesPerCall`
  // keep working after the value is copied onto the wrapper object.
  const maxImagesPerCall =
    maxImagesPerCallRaw instanceof Function
      ? maxImagesPerCallRaw.bind(model)
      : maxImagesPerCallRaw;

  return {
    specificationVersion: 'v3',
    provider: providerId ?? overrideProvider?.({ model }) ?? model.provider,
    modelId: modelId ?? overrideModelId?.({ model }) ?? model.modelId,
    maxImagesPerCall,
    async doGenerate(
      params: ImageModelV3CallOptions,
    ): Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>> {
      const transformedParams = await doTransform({ params });
      const doGenerate = async () => model.doGenerate(transformedParams);
      return wrapGenerate
        ? wrapGenerate({
            doGenerate,
            params: transformedParams,
            model,
          })
        : doGenerate();
    },
  };
};
