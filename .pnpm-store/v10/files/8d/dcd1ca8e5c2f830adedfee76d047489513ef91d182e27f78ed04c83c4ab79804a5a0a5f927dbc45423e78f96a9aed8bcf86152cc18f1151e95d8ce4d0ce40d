import Anthropic, { ClientOptions } from "@anthropic-ai/sdk";
import {
  ImageBlockParam,
  MessageParam,
  TextBlockParam,
  Tool,
} from "@anthropic-ai/sdk/resources";
import { zodToJsonSchema } from "zod-to-json-schema";
import { LogLine } from "../../types/log";
import { AnthropicJsonSchemaObject, AvailableModel } from "../../types/model";
import { LLMCache } from "../cache/LLMCache";
import {
  CreateChatCompletionOptions,
  LLMClient,
  LLMResponse,
} from "./LLMClient";

export class AnthropicClient extends LLMClient {
  public type = "anthropic" as const;
  private client: Anthropic;
  private cache: LLMCache | undefined;
  private enableCaching: boolean;
  public clientOptions: ClientOptions;

  constructor({
    enableCaching = false,
    cache,
    modelName,
    clientOptions,
    userProvidedInstructions,
  }: {
    logger: (message: LogLine) => void;
    enableCaching?: boolean;
    cache?: LLMCache;
    modelName: AvailableModel;
    clientOptions?: ClientOptions;
    userProvidedInstructions?: string;
  }) {
    super(modelName);
    this.client = new Anthropic(clientOptions);
    this.cache = cache;
    this.enableCaching = enableCaching;
    this.modelName = modelName;
    this.clientOptions = clientOptions;
    this.userProvidedInstructions = userProvidedInstructions;
  }

  async createChatCompletion<T = LLMResponse>({
    options,
    retries,
    logger,
  }: CreateChatCompletionOptions): Promise<T> {
    const optionsWithoutImage = { ...options };
    delete optionsWithoutImage.image;

    logger({
      category: "anthropic",
      message: "creating chat completion",
      level: 1,
      auxiliary: {
        options: {
          value: JSON.stringify(optionsWithoutImage),
          type: "object",
        },
      },
    });

    // Try to get cached response
    const cacheOptions = {
      model: this.modelName,
      messages: options.messages,
      temperature: options.temperature,
      image: options.image,
      response_model: options.response_model,
      tools: options.tools,
      retries: retries,
    };

    if (this.enableCaching) {
      const cachedResponse = await this.cache.get<T>(
        cacheOptions,
        options.requestId,
      );
      if (cachedResponse) {
        logger({
          category: "llm_cache",
          message: "LLM cache hit - returning cached response",
          level: 1,
          auxiliary: {
            cachedResponse: {
              value: JSON.stringify(cachedResponse),
              type: "object",
            },
            requestId: {
              value: options.requestId,
              type: "string",
            },
            cacheOptions: {
              value: JSON.stringify(cacheOptions),
              type: "object",
            },
          },
        });
        return cachedResponse as T;
      } else {
        logger({
          category: "llm_cache",
          message: "LLM cache miss - no cached response found",
          level: 1,
          auxiliary: {
            cacheOptions: {
              value: JSON.stringify(cacheOptions),
              type: "object",
            },
            requestId: {
              value: options.requestId,
              type: "string",
            },
          },
        });
      }
    }

    const systemMessage = options.messages.find((msg) => {
      if (msg.role === "system") {
        if (typeof msg.content === "string") {
          return true;
        } else if (Array.isArray(msg.content)) {
          return msg.content.every((content) => content.type !== "image_url");
        }
      }
      return false;
    });

    const userMessages = options.messages.filter(
      (msg) => msg.role !== "system",
    );

    const formattedMessages: MessageParam[] = userMessages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role as "user" | "assistant", // ensure its not checking for system types
          content: msg.content,
        };
      } else {
        return {
          role: msg.role as "user" | "assistant",
          content: msg.content.map((content) => {
            if ("image_url" in content) {
              const formattedContent: ImageBlockParam = {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: content.image_url.url,
                },
              };

              return formattedContent;
            } else {
              return { type: "text", text: content.text };
            }
          }),
        };
      }
    });

    if (options.image) {
      const screenshotMessage: MessageParam = {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: options.image.buffer.toString("base64"),
            },
          },
        ],
      };

      if (
        options.image.description &&
        Array.isArray(screenshotMessage.content)
      ) {
        screenshotMessage.content.push({
          type: "text",
          text: options.image.description,
        });
      }

      formattedMessages.push(screenshotMessage);
    }

    let anthropicTools: Tool[] = options.tools?.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object",
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      };
    });

    let toolDefinition: Tool | undefined;
    if (options.response_model) {
      const jsonSchema = zodToJsonSchema(options.response_model.schema);
      const { properties: schemaProperties, required: schemaRequired } =
        extractSchemaProperties(jsonSchema);

      toolDefinition = {
        name: "print_extracted_data",
        description: "Prints the extracted data based on the provided schema.",
        input_schema: {
          type: "object",
          properties: schemaProperties,
          required: schemaRequired,
        },
      };
    }

    if (toolDefinition) {
      anthropicTools = anthropicTools ?? [];
      anthropicTools.push(toolDefinition);
    }

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: options.maxTokens || 8192,
      messages: formattedMessages,
      tools: anthropicTools,
      system: systemMessage
        ? (systemMessage.content as string | TextBlockParam[]) // we can cast because we already filtered out image content
        : undefined,
      temperature: options.temperature,
    });

    logger({
      category: "anthropic",
      message: "response",
      level: 1,
      auxiliary: {
        response: {
          value: JSON.stringify(response),
          type: "object",
        },
        requestId: {
          value: options.requestId,
          type: "string",
        },
      },
    });

    const transformedResponse: LLMResponse = {
      id: response.id,
      object: "chat.completion",
      created: Date.now(),
      model: response.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content:
              response.content.find((c) => c.type === "text")?.text || null,
            tool_calls: response.content
              .filter((c) => c.type === "tool_use")
              .map((toolUse) => ({
                id: toolUse.id,
                type: "function",
                function: {
                  name: toolUse.name,
                  arguments: JSON.stringify(toolUse.input),
                },
              })),
          },
          finish_reason: response.stop_reason,
        },
      ],
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    };

    logger({
      category: "anthropic",
      message: "transformed response",
      level: 1,
      auxiliary: {
        transformedResponse: {
          value: JSON.stringify(transformedResponse),
          type: "object",
        },
        requestId: {
          value: options.requestId,
          type: "string",
        },
      },
    });

    if (options.response_model) {
      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (toolUse && "input" in toolUse) {
        const result = toolUse.input;
        if (this.enableCaching) {
          this.cache.set(cacheOptions, result, options.requestId);
        }

        return result as T; // anthropic returns this as `unknown`, so we need to cast
      } else {
        if (!retries || retries < 5) {
          return this.createChatCompletion({
            options,
            logger,
            retries: (retries ?? 0) + 1,
          });
        }
        logger({
          category: "anthropic",
          message: "error creating chat completion",
          level: 1,
          auxiliary: {
            requestId: {
              value: options.requestId,
              type: "string",
            },
          },
        });
        throw new Error(
          "Create Chat Completion Failed: No tool use with input in response",
        );
      }
    }

    if (this.enableCaching) {
      this.cache.set(cacheOptions, transformedResponse, options.requestId);
      logger({
        category: "anthropic",
        message: "cached response",
        level: 1,
        auxiliary: {
          requestId: {
            value: options.requestId,
            type: "string",
          },
          transformedResponse: {
            value: JSON.stringify(transformedResponse),
            type: "object",
          },
          cacheOptions: {
            value: JSON.stringify(cacheOptions),
            type: "object",
          },
        },
      });
    }

    // if the function was called with a response model, it would have returned earlier
    // so we can safely cast here to T, which defaults to AnthropicTransformedResponse
    return transformedResponse as T;
  }
}

const extractSchemaProperties = (jsonSchema: AnthropicJsonSchemaObject) => {
  const schemaRoot = jsonSchema.definitions?.MySchema || jsonSchema;

  return {
    properties: schemaRoot.properties,
    required: schemaRoot.required,
  };
};
