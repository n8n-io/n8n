import { Experimental_VideoModelV3 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockVideoModelV3 implements Experimental_VideoModelV3 {
  readonly specificationVersion = 'v3';
  readonly provider: Experimental_VideoModelV3['provider'];
  readonly modelId: Experimental_VideoModelV3['modelId'];
  readonly maxVideosPerCall: Experimental_VideoModelV3['maxVideosPerCall'];

  doGenerate: Experimental_VideoModelV3['doGenerate'];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    maxVideosPerCall = 1,
    doGenerate = notImplemented,
  }: {
    provider?: Experimental_VideoModelV3['provider'];
    modelId?: Experimental_VideoModelV3['modelId'];
    maxVideosPerCall?: Experimental_VideoModelV3['maxVideosPerCall'];
    doGenerate?: Experimental_VideoModelV3['doGenerate'];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.maxVideosPerCall = maxVideosPerCall;
    this.doGenerate = doGenerate;
  }
}
