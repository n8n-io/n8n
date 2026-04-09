import { SpeechModelV3 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockSpeechModelV3 implements SpeechModelV3 {
  readonly specificationVersion = 'v3';
  readonly provider: SpeechModelV3['provider'];
  readonly modelId: SpeechModelV3['modelId'];

  doGenerate: SpeechModelV3['doGenerate'];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    doGenerate = notImplemented,
  }: {
    provider?: SpeechModelV3['provider'];
    modelId?: SpeechModelV3['modelId'];
    doGenerate?: SpeechModelV3['doGenerate'];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
}
