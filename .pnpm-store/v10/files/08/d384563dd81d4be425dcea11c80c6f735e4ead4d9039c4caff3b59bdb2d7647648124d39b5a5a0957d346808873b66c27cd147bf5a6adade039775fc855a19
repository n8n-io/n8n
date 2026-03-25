import { LogLine } from "../../types/log";
import {
  AvailableModel,
  ClientOptions,
  ModelProvider,
} from "../../types/model";
import { LLMCache } from "../cache/LLMCache";
import { AnthropicClient } from "./AnthropicClient";
import { CerebrasClient } from "./CerebrasClient";
import { GroqClient } from "./GroqClient";
import { LLMClient } from "./LLMClient";
import { OpenAIClient } from "./OpenAIClient";

const modelToProviderMap: { [key in AvailableModel]: ModelProvider } = {
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
  "gpt-4o-2024-08-06": "openai",
  "gpt-4.5-preview": "openai",
  "o1-mini": "openai",
  "o1-preview": "openai",
  "o3-mini": "openai",
  "claude-3-5-sonnet-latest": "anthropic",
  "claude-3-5-sonnet-20240620": "anthropic",
  "claude-3-5-sonnet-20241022": "anthropic",
  "claude-3-7-sonnet-20250219": "anthropic",
  "claude-3-7-sonnet-latest": "anthropic",
  "cerebras-llama-3.3-70b": "cerebras",
  "cerebras-llama-3.1-8b": "cerebras",
  "groq-llama-3.3-70b-versatile": "groq",
  "groq-llama-3.3-70b-specdec": "groq",
};

export class LLMProvider {
  private logger: (message: LogLine) => void;
  private enableCaching: boolean;
  private cache: LLMCache | undefined;

  constructor(logger: (message: LogLine) => void, enableCaching: boolean) {
    this.logger = logger;
    this.enableCaching = enableCaching;
    this.cache = enableCaching ? new LLMCache(logger) : undefined;
  }

  cleanRequestCache(requestId: string): void {
    if (!this.enableCaching) {
      return;
    }

    this.logger({
      category: "llm_cache",
      message: "cleaning up cache",
      level: 1,
      auxiliary: {
        requestId: {
          value: requestId,
          type: "string",
        },
      },
    });
    this.cache.deleteCacheForRequestId(requestId);
  }

  getClient(
    modelName: AvailableModel,
    clientOptions?: ClientOptions,
  ): LLMClient {
    const provider = modelToProviderMap[modelName];
    if (!provider) {
      throw new Error(`Unsupported model: ${modelName}`);
    }

    switch (provider) {
      case "openai":
        return new OpenAIClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions,
        });
      case "anthropic":
        return new AnthropicClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions,
        });
      case "cerebras":
        return new CerebrasClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions,
        });
      case "groq":
        return new GroqClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions,
        });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  static getModelProvider(modelName: AvailableModel): ModelProvider {
    const provider = modelToProviderMap[modelName];

    return provider;
  }
}
