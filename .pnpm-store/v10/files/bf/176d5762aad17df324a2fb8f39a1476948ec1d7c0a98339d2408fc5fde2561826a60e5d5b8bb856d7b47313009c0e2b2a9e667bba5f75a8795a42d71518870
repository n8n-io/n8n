import { SpeechModelV2 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockSpeechModelV2 implements SpeechModelV2 {
  readonly specificationVersion = 'v2';
  readonly provider: SpeechModelV2['provider'];
  readonly modelId: SpeechModelV2['modelId'];

  doGenerate: SpeechModelV2['doGenerate'];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    doGenerate = notImplemented,
  }: {
    provider?: SpeechModelV2['provider'];
    modelId?: SpeechModelV2['modelId'];
    doGenerate?: SpeechModelV2['doGenerate'];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
}
