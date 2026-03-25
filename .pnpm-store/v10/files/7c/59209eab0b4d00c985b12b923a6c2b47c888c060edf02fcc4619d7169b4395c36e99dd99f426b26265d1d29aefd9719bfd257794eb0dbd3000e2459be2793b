import type { ClientOptions } from "openai";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { LogLine } from "../../types/log";
import { AvailableModel } from "../../types/model";
import { LLMCache } from "../cache/LLMCache";
import {
  ChatMessage,
  CreateChatCompletionOptions,
  LLMClient,
  LLMResponse,
} from "./LLMClient";

export class GroqClient extends LLMClient {
  public type = "groq" as const;
  private client: OpenAI;
  private cache: LLMCache | undefined;
  private enableCaching: boolean;
  public clientOptions: ClientOptions;
  public hasVision = false;

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
    super(modelName, userProvidedInstructions);

    // Create OpenAI client with the base URL set to Groq API
    this.client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: clientOptions?.apiKey || process.env.GROQ_API_KEY,
      ...clientOptions,
    });

    this.cache = cache;
    this.enableCaching = enableCaching;
    this.modelName = modelName;
    this.clientOptions = clientOptions;
  }

  async createChatCompletion<T = LLMResponse>({
    options,
    retries,
    logger,
  }: CreateChatCompletionOptions): Promise<T> {
    const optionsWithoutImage = { ...options };
    delete optionsWithoutImage.image;

    logger({
      category: "groq",
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
      model: this.modelName.split("groq-")[1],
      messages: options.messages,
      temperature: options.temperature,
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
      }
    }

    // Format messages for Groq API (using OpenAI format)
    const formattedMessages = options.messages.map((msg: ChatMessage) => {
      const baseMessage = {
        content:
          typeof msg.content === "string"
            ? msg.content
            : Array.isArray(msg.content) &&
                msg.content.length > 0 &&
                "text" in msg.content[0]
              ? msg.content[0].text
              : "",
      };

      // Groq supports system, user, and assistant roles
      if (msg.role === "system") {
        return { ...baseMessage, role: "system" as const };
      } else if (msg.role === "assistant") {
        return { ...baseMessage, role: "assistant" as const };
      } else {
        // Default to user for any other role
        return { ...baseMessage, role: "user" as const };
      }
    });

    // Format tools if provided
    let tools = options.tools?.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      },
    }));

    // Add response model as a tool if provided
    if (options.response_model) {
      const jsonSchema = zodToJsonSchema(options.response_model.schema) as {
        properties?: Record<string, unknown>;
        required?: string[];
      };
      const schemaProperties = jsonSchema.properties || {};
      const schemaRequired = jsonSchema.required || [];

      const responseTool = {
        type: "function" as const,
        function: {
          name: "print_extracted_data",
          description:
            "Prints the extracted data based on the provided schema.",
          parameters: {
            type: "object",
            properties: schemaProperties,
            required: schemaRequired,
          },
        },
      };

      tools = tools ? [...tools, responseTool] : [responseTool];
    }

    try {
      // Use OpenAI client with Groq API
      const apiResponse = await this.client.chat.completions.create({
        model: this.modelName.split("groq-")[1],
        messages: [
          ...formattedMessages,
          // Add explicit instruction to return JSON if we have a response model
          ...(options.response_model
            ? [
                {
                  role: "system" as const,
                  content: `IMPORTANT: Your response must be valid JSON that matches this schema: ${JSON.stringify(options.response_model.schema)}`,
                },
              ]
            : []),
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens,
        tools: tools,
        tool_choice: options.tool_choice || "auto",
      });

      // Format the response to match the expected LLMResponse format
      const response: LLMResponse = {
        id: apiResponse.id,
        object: "chat.completion",
        created: Date.now(),
        model: this.modelName.split("groq-")[1],
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: apiResponse.choices[0]?.message?.content || null,
              tool_calls: apiResponse.choices[0]?.message?.tool_calls || [],
            },
            finish_reason: apiResponse.choices[0]?.finish_reason || "stop",
          },
        ],
        usage: {
          prompt_tokens: apiResponse.usage?.prompt_tokens || 0,
          completion_tokens: apiResponse.usage?.completion_tokens || 0,
          total_tokens: apiResponse.usage?.total_tokens || 0,
        },
      };

      logger({
        category: "groq",
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

      if (options.response_model) {
        // First try standard function calling format
        const toolCall = response.choices[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const result = JSON.parse(toolCall.function.arguments);
            if (this.enableCaching) {
              this.cache.set(cacheOptions, result, options.requestId);
            }
            return result as T;
          } catch (e) {
            // If JSON parse fails, the model might be returning a different format
            logger({
              category: "groq",
              message: "failed to parse tool call arguments as JSON, retrying",
              level: 1,
              auxiliary: {
                error: {
                  value: e.message,
                  type: "string",
                },
              },
            });
          }
        }

        // If we have content but no tool calls, try to parse the content as JSON
        const content = response.choices[0]?.message?.content;
        if (content) {
          try {
            // Try to extract JSON from the content
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              if (this.enableCaching) {
                this.cache.set(cacheOptions, result, options.requestId);
              }
              return result as T;
            }
          } catch (e) {
            logger({
              category: "groq",
              message: "failed to parse content as JSON",
              level: 1,
              auxiliary: {
                error: {
                  value: e.message,
                  type: "string",
                },
              },
            });
          }
        }

        // If we still haven't found valid JSON and have retries left, try again
        if (!retries || retries < 5) {
          return this.createChatCompletion({
            options,
            logger,
            retries: (retries ?? 0) + 1,
          });
        }

        throw new Error(
          "Create Chat Completion Failed: Could not extract valid JSON from response",
        );
      }

      if (this.enableCaching) {
        this.cache.set(cacheOptions, response, options.requestId);
      }

      return response as T;
    } catch (error) {
      logger({
        category: "groq",
        message: "error creating chat completion",
        level: 1,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          requestId: {
            value: options.requestId,
            type: "string",
          },
        },
      });
      throw error;
    }
  }
}
