import { ImageModelV2 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockImageModelV2 implements ImageModelV2 {
  readonly specificationVersion = 'v2';
  readonly provider: ImageModelV2['provider'];
  readonly modelId: ImageModelV2['modelId'];
  readonly maxImagesPerCall: ImageModelV2['maxImagesPerCall'];

  doGenerate: ImageModelV2['doGenerate'];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    maxImagesPerCall = 1,
    doGenerate = notImplemented,
  }: {
    provider?: ImageModelV2['provider'];
    modelId?: ImageModelV2['modelId'];
    maxImagesPerCall?: ImageModelV2['maxImagesPerCall'];
    doGenerate?: ImageModelV2['doGenerate'];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.maxImagesPerCall = maxImagesPerCall;
    this.doGenerate = doGenerate;
  }
}
