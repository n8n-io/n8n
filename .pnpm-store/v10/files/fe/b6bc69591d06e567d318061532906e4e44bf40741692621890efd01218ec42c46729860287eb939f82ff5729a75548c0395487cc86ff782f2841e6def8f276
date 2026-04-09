import { TranscriptionModelV2 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockTranscriptionModelV2 implements TranscriptionModelV2 {
  readonly specificationVersion = 'v2';
  readonly provider: TranscriptionModelV2['provider'];
  readonly modelId: TranscriptionModelV2['modelId'];

  doGenerate: TranscriptionModelV2['doGenerate'];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    doGenerate = notImplemented,
  }: {
    provider?: TranscriptionModelV2['provider'];
    modelId?: TranscriptionModelV2['modelId'];
    doGenerate?: TranscriptionModelV2['doGenerate'];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
}
