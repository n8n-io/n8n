// test/index.ts
import {
  convertArrayToAsyncIterable,
  convertArrayToReadableStream,
  convertReadableStreamToArray,
  mockId
} from "@ai-sdk/provider-utils/test";

// src/test/not-implemented.ts
function notImplemented() {
  throw new Error("Not implemented");
}

// src/test/mock-embedding-model-v3.ts
var MockEmbeddingModelV3 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    maxEmbeddingsPerCall = 1,
    supportsParallelCalls = false,
    doEmbed = notImplemented
  } = {}) {
    this.specificationVersion = "v3";
    this.doEmbedCalls = [];
    this.provider = provider;
    this.modelId = modelId;
    this.maxEmbeddingsPerCall = maxEmbeddingsPerCall ?? void 0;
    this.supportsParallelCalls = supportsParallelCalls;
    this.doEmbed = async (options) => {
      this.doEmbedCalls.push(options);
      if (typeof doEmbed === "function") {
        return doEmbed(options);
      } else if (Array.isArray(doEmbed)) {
        return doEmbed[this.doEmbedCalls.length];
      } else {
        return doEmbed;
      }
    };
  }
};

// src/test/mock-image-model-v3.ts
var MockImageModelV3 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    maxImagesPerCall = 1,
    doGenerate = notImplemented
  } = {}) {
    this.specificationVersion = "v3";
    this.provider = provider;
    this.modelId = modelId;
    this.maxImagesPerCall = maxImagesPerCall;
    this.doGenerate = doGenerate;
  }
};

// src/test/mock-language-model-v3.ts
var MockLanguageModelV3 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    supportedUrls = {},
    doGenerate = notImplemented,
    doStream = notImplemented
  } = {}) {
    this.specificationVersion = "v3";
    this.doGenerateCalls = [];
    this.doStreamCalls = [];
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = async (options) => {
      this.doGenerateCalls.push(options);
      if (typeof doGenerate === "function") {
        return doGenerate(options);
      } else if (Array.isArray(doGenerate)) {
        return doGenerate[this.doGenerateCalls.length];
      } else {
        return doGenerate;
      }
    };
    this.doStream = async (options) => {
      this.doStreamCalls.push(options);
      if (typeof doStream === "function") {
        return doStream(options);
      } else if (Array.isArray(doStream)) {
        return doStream[this.doStreamCalls.length];
      } else {
        return doStream;
      }
    };
    this._supportedUrls = typeof supportedUrls === "function" ? supportedUrls : async () => supportedUrls;
  }
  get supportedUrls() {
    return this._supportedUrls();
  }
};

// src/test/mock-provider-v3.ts
import {
  NoSuchModelError
} from "@ai-sdk/provider";
var MockProviderV3 = class {
  constructor({
    languageModels,
    embeddingModels,
    imageModels,
    transcriptionModels,
    speechModels,
    rerankingModels
  } = {}) {
    this.specificationVersion = "v3";
    this.languageModel = (modelId) => {
      if (!languageModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: "languageModel" });
      }
      return languageModels[modelId];
    };
    this.embeddingModel = (modelId) => {
      if (!embeddingModels?.[modelId]) {
        throw new NoSuchModelError({
          modelId,
          modelType: "embeddingModel"
        });
      }
      return embeddingModels[modelId];
    };
    this.imageModel = (modelId) => {
      if (!imageModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: "imageModel" });
      }
      return imageModels[modelId];
    };
    this.transcriptionModel = (modelId) => {
      if (!transcriptionModels?.[modelId]) {
        throw new NoSuchModelError({
          modelId,
          modelType: "transcriptionModel"
        });
      }
      return transcriptionModels[modelId];
    };
    this.speechModel = (modelId) => {
      if (!speechModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: "speechModel" });
      }
      return speechModels[modelId];
    };
    this.rerankingModel = (modelId) => {
      if (!rerankingModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: "rerankingModel" });
      }
      return rerankingModels[modelId];
    };
  }
};

// src/test/mock-speech-model-v3.ts
var MockSpeechModelV3 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    doGenerate = notImplemented
  } = {}) {
    this.specificationVersion = "v3";
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
};

// src/test/mock-transcription-model-v3.ts
var MockTranscriptionModelV3 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    doGenerate = notImplemented
  } = {}) {
    this.specificationVersion = "v3";
    this.provider = provider;
    this.modelId = modelId;
    this.doGenerate = doGenerate;
  }
};

// src/test/mock-reranking-model-v3.ts
var MockRerankingModelV3 = class {
  constructor({
    provider = "mock-provider",
    modelId = "mock-model-id",
    doRerank = notImplemented
  } = {}) {
    this.specificationVersion = "v3";
    this.provider = provider;
    this.modelId = modelId;
    this.doRerank = doRerank;
  }
};

// src/test/mock-values.ts
function mockValues(...values) {
  let counter = 0;
  return () => values[counter++] ?? values[values.length - 1];
}

// src/util/simulate-readable-stream.ts
import { delay as delayFunction } from "@ai-sdk/provider-utils";
function simulateReadableStream({
  chunks,
  initialDelayInMs = 0,
  chunkDelayInMs = 0,
  _internal
}) {
  const delay = _internal?.delay ?? delayFunction;
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        await delay(index === 0 ? initialDelayInMs : chunkDelayInMs);
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    }
  });
}

// test/index.ts
var simulateReadableStream2 = simulateReadableStream;
export {
  MockEmbeddingModelV3,
  MockImageModelV3,
  MockLanguageModelV3,
  MockProviderV3,
  MockRerankingModelV3,
  MockSpeechModelV3,
  MockTranscriptionModelV3,
  convertArrayToAsyncIterable,
  convertArrayToReadableStream,
  convertReadableStreamToArray,
  mockId,
  mockValues,
  simulateReadableStream2 as simulateReadableStream
};
//# sourceMappingURL=index.mjs.map