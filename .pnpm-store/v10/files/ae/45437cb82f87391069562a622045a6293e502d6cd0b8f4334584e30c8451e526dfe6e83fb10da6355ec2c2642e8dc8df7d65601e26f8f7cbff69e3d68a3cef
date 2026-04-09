import { AISDKError } from './ai-sdk-error';

const name = 'AI_NoSuchModelError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class NoSuchModelError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly modelId: string;
  readonly modelType:
    | 'languageModel'
    | 'embeddingModel'
    | 'imageModel'
    | 'transcriptionModel'
    | 'speechModel'
    | 'rerankingModel'
    | 'videoModel';

  constructor({
    errorName = name,
    modelId,
    modelType,
    message = `No such ${modelType}: ${modelId}`,
  }: {
    errorName?: string;
    modelId: string;
    modelType:
      | 'languageModel'
      | 'embeddingModel'
      | 'imageModel'
      | 'transcriptionModel'
      | 'speechModel'
      | 'rerankingModel'
      | 'videoModel';
    message?: string;
  }) {
    super({ name: errorName, message });

    this.modelId = modelId;
    this.modelType = modelType;
  }

  static isInstance(error: unknown): error is NoSuchModelError {
    return AISDKError.hasMarker(error, marker);
  }
}
