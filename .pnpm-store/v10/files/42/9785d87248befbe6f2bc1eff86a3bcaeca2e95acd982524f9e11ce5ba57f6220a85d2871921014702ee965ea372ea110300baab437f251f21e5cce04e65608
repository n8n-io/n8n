import { TranscriptionModelV3 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockTranscriptionModelV3 implements TranscriptionModelV3 {
  readonly specificationVersion = 'v3';
  readonly provider: TranscriptionModelV3['provider'];
  readonly modelId: TranscriptionModelV3['modelId'];

  doGenerate: TranscriptionModelV3['doGenerate'];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    doGenerate = notImplemented,
  }: {
    provider?: TranscriptionModelV3['provider'];
    modelId?: TranscriptionModelV3['modelId'];
    doGenerate?: TranscriptionModelV3['doGenerate'];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
}
