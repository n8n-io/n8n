"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// test/index.ts
var test_exports = {};
__export(test_exports, {
  MockEmbeddingModelV3: () => MockEmbeddingModelV3,
  MockImageModelV3: () => MockImageModelV3,
  MockLanguageModelV3: () => MockLanguageModelV3,
  MockProviderV3: () => MockProviderV3,
  MockRerankingModelV3: () => MockRerankingModelV3,
  MockSpeechModelV3: () => MockSpeechModelV3,
  MockTranscriptionModelV3: () => MockTranscriptionModelV3,
  convertArrayToAsyncIterable: () => import_test.convertArrayToAsyncIterable,
  convertArrayToReadableStream: () => import_test.convertArrayToReadableStream,
  convertReadableStreamToArray: () => import_test.convertReadableStreamToArray,
  mockId: () => import_test.mockId,
  mockValues: () => mockValues,
  simulateReadableStream: () => simulateReadableStream2
});
module.exports = __toCommonJS(test_exports);
var import_test = require("@ai-sdk/provider-utils/test");

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
var import_provider = require("@ai-sdk/provider");
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
        throw new import_provider.NoSuchModelError({ modelId, modelType: "languageModel" });
      }
      return languageModels[modelId];
    };
    this.embeddingModel = (modelId) => {
      if (!embeddingModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({
          modelId,
          modelType: "embeddingModel"
        });
      }
      return embeddingModels[modelId];
    };
    this.imageModel = (modelId) => {
      if (!imageModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({ modelId, modelType: "imageModel" });
      }
      return imageModels[modelId];
    };
    this.transcriptionModel = (modelId) => {
      if (!transcriptionModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({
          modelId,
          modelType: "transcriptionModel"
        });
      }
      return transcriptionModels[modelId];
    };
    this.speechModel = (modelId) => {
      if (!speechModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({ modelId, modelType: "speechModel" });
      }
      return speechModels[modelId];
    };
    this.rerankingModel = (modelId) => {
      if (!rerankingModels?.[modelId]) {
        throw new import_provider.NoSuchModelError({ modelId, modelType: "rerankingModel" });
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
var import_provider_utils = require("@ai-sdk/provider-utils");
function simulateReadableStream({
  chunks,
  initialDelayInMs = 0,
  chunkDelayInMs = 0,
  _internal
}) {
  const delay = _internal?.delay ?? import_provider_utils.delay;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  simulateReadableStream
});
//# sourceMappingURL=index.js.map