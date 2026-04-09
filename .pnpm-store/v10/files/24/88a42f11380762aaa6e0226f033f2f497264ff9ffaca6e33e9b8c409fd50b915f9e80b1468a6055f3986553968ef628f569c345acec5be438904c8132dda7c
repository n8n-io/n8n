import { ImageModelV3 } from '../../image-model/v3/image-model-v3';
import { ImageModelV3CallOptions } from '../../image-model/v3/image-model-v3-call-options';

/**
 * Middleware for ImageModelV3.
 * This type defines the structure for middleware that can be used to modify
 * the behavior of ImageModelV3 operations.
 */
export type ImageModelV3Middleware = {
  /**
   * Middleware specification version. Use `v3` for the current version.
   */
  readonly specificationVersion: 'v3';

  /**
   * Override the provider name if desired.
   * @param options.model - The image model instance.
   */
  overrideProvider?: (options: { model: ImageModelV3 }) => string;

  /**
   * Override the model ID if desired.
   * @param options.model - The image model instance.
   */
  overrideModelId?: (options: { model: ImageModelV3 }) => string;

  /**
   * Override the limit of how many images can be generated in a single API call if desired.
   * @param options.model - The image model instance.
   */
  overrideMaxImagesPerCall?: (options: {
    model: ImageModelV3;
  }) => ImageModelV3['maxImagesPerCall'];

  /**
   * Transforms the parameters before they are passed to the image model.
   * @param options - Object containing the parameters.
   * @param options.params - The original parameters for the image model call.
   * @returns A promise that resolves to the transformed parameters.
   */
  transformParams?: (options: {
    params: ImageModelV3CallOptions;
    model: ImageModelV3;
  }) => PromiseLike<ImageModelV3CallOptions>;

  /**
   * Wraps the generate operation of the image model.
   *
   * @param options - Object containing the generate function, parameters, and model.
   * @param options.doGenerate - The original generate function.
   * @param options.params - The parameters for the generate call. If the
   * `transformParams` middleware is used, this will be the transformed parameters.
   * @param options.model - The image model instance.
   * @returns A promise that resolves to the result of the generate operation.
   */
  wrapGenerate?: (options: {
    doGenerate: () => ReturnType<ImageModelV3['doGenerate']>;
    params: ImageModelV3CallOptions;
    model: ImageModelV3;
  }) => Promise<Awaited<ReturnType<ImageModelV3['doGenerate']>>>;
};
