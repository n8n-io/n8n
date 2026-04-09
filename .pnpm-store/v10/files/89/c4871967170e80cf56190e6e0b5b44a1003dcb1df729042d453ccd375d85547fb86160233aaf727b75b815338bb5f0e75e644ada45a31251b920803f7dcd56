import { LanguageModelV2 } from '@ai-sdk/provider';
import { notImplemented } from './not-implemented';

export class MockLanguageModelV2 implements LanguageModelV2 {
  readonly specificationVersion = 'v2';

  private _supportedUrls: () => LanguageModelV2['supportedUrls'];

  readonly provider: LanguageModelV2['provider'];
  readonly modelId: LanguageModelV2['modelId'];

  doGenerate: LanguageModelV2['doGenerate'];
  doStream: LanguageModelV2['doStream'];

  doGenerateCalls: Parameters<LanguageModelV2['doGenerate']>[0][] = [];
  doStreamCalls: Parameters<LanguageModelV2['doStream']>[0][] = [];

  constructor({
    provider = 'mock-provider',
    modelId = 'mock-model-id',
    supportedUrls = {},
    doGenerate = notImplemented,
    doStream = notImplemented,
  }: {
    provider?: LanguageModelV2['provider'];
    modelId?: LanguageModelV2['modelId'];
    supportedUrls?:
      | LanguageModelV2['supportedUrls']
      | (() => LanguageModelV2['supportedUrls']);
    doGenerate?:
      | LanguageModelV2['doGenerate']
      | Awaited<ReturnType<LanguageModelV2['doGenerate']>>
      | Awaited<ReturnType<LanguageModelV2['doGenerate']>>[];
    doStream?:
      | LanguageModelV2['doStream']
      | Awaited<ReturnType<LanguageModelV2['doStream']>>
      | Awaited<ReturnType<LanguageModelV2['doStream']>>[];
  } = {}) {
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = async options => {
      this.doGenerateCalls.push(options);

      if (typeof doGenerate === 'function') {
        return doGenerate(options);
      } else if (Array.isArray(doGenerate)) {
        return doGenerate[this.doGenerateCalls.length];
      } else {
        return doGenerate;
      }
    };
    this.doStream = async options => {
      this.doStreamCalls.push(options);

      if (typeof doStream === 'function') {
        return doStream(options);
      } else if (Array.isArray(doStream)) {
        return doStream[this.doStreamCalls.length];
      } else {
        return doStream;
      }
    };
    this._supportedUrls =
      typeof supportedUrls === 'function'
        ? supportedUrls
        : async () => supportedUrls;
  }

  get supportedUrls() {
    return this._supportedUrls();
  }
}
