import { ImageModelV3 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockImageModelV3 implements ImageModelV3 {
  readonly specificationVersion = 'v3';
  readonly provider: ImageModelV3['provider'];
  readonly modelId: ImageModelV3['modelId'];
  readonly maxImagesPerCall: ImageModelV3['maxImagesPerCall'];

  doGenerate: ImageModelV3['doGenerate'];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    maxImagesPerCall = 1,
    doGenerate = notImplemented,
  }: {
    provider?: ImageModelV3['provider'];
    modelId?: ImageModelV3['modelId'];
    maxImagesPerCall?: ImageModelV3['maxImagesPerCall'];
    doGenerate?: ImageModelV3['doGenerate'];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.maxImagesPerCall = maxImagesPerCall;
    this.doGenerate = doGenerate;
  }
}
