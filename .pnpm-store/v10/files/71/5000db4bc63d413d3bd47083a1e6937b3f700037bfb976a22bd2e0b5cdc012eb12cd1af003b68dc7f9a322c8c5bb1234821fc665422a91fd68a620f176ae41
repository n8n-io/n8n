import { z } from "zod";
import { ActCommandParams, ActCommandResult } from "../types/act";
import { VerifyActCompletionParams } from "../types/inference";
import { LogLine } from "../types/log";
import { ChatMessage, LLMClient } from "./llm/LLMClient";
import {
  actTools,
  buildActSystemPrompt,
  buildActUserPrompt,
  buildExtractSystemPrompt,
  buildExtractUserPrompt,
  buildMetadataPrompt,
  buildMetadataSystemPrompt,
  buildObserveSystemPrompt,
  buildObserveUserMessage,
  buildRefineSystemPrompt,
  buildRefineUserPrompt,
  buildVerifyActCompletionSystemPrompt,
  buildVerifyActCompletionUserPrompt,
} from "./prompt";

export async function verifyActCompletion({
  goal,
  steps,
  llmClient,
  domElements,
  logger,
  requestId,
}: VerifyActCompletionParams): Promise<boolean> {
  const verificationSchema = z.object({
    completed: z.boolean().describe("true if the goal is accomplished"),
  });

  type VerificationResponse = z.infer<typeof verificationSchema>;

  const response = await llmClient.createChatCompletion<VerificationResponse>({
    options: {
      messages: [
        buildVerifyActCompletionSystemPrompt(),
        buildVerifyActCompletionUserPrompt(goal, steps, domElements),
      ],
      temperature: 0.1,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      response_model: {
        name: "Verification",
        schema: verificationSchema,
      },
      requestId,
    },
    logger,
  });

  if (!response || typeof response !== "object") {
    logger({
      category: "VerifyAct",
      message: "Unexpected response format: " + JSON.stringify(response),
    });
    return false;
  }

  if (response.completed === undefined) {
    logger({
      category: "VerifyAct",
      message: "Missing 'completed' field in response",
    });
    return false;
  }

  return response.completed;
}

export function fillInVariables(
  text: string,
  variables: Record<string, string>,
) {
  let processedText = text;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `<|${key.toUpperCase()}|>`;
    processedText = processedText.replace(placeholder, value);
  });
  return processedText;
}

export async function act({
  action,
  domElements,
  steps,
  llmClient,
  retries = 0,
  logger,
  requestId,
  variables,
  userProvidedInstructions,
}: ActCommandParams): Promise<ActCommandResult | null> {
  const messages: ChatMessage[] = [
    buildActSystemPrompt(userProvidedInstructions),
    buildActUserPrompt(action, steps, domElements, variables),
  ];

  const response = await llmClient.createChatCompletion({
    options: {
      messages,
      temperature: 0.1,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      tool_choice: "auto" as const,
      tools: actTools,
      requestId,
    },
    logger,
  });

  const toolCalls = response.choices[0].message.tool_calls;

  if (toolCalls && toolCalls.length > 0) {
    if (toolCalls[0].function.name === "skipSection") {
      return null;
    }

    return JSON.parse(toolCalls[0].function.arguments);
  } else {
    if (retries >= 2) {
      logger({
        category: "Act",
        message: "No tool calls found in response",
      });
      return null;
    }

    return act({
      action,
      domElements,
      steps,
      llmClient,
      retries: retries + 1,
      logger,
      requestId,
    });
  }
}

export async function extract({
  instruction,
  previouslyExtractedContent,
  domElements,
  schema,
  llmClient,
  chunksSeen,
  chunksTotal,
  requestId,
  logger,
  isUsingTextExtract,
  userProvidedInstructions,
}: {
  instruction: string;
  previouslyExtractedContent: object;
  domElements: string;
  schema: z.ZodObject<z.ZodRawShape>;
  llmClient: LLMClient;
  chunksSeen: number;
  chunksTotal: number;
  requestId: string;
  isUsingTextExtract?: boolean;
  userProvidedInstructions?: string;
  logger: (message: LogLine) => void;
}) {
  type ExtractionResponse = z.infer<typeof schema>;
  type MetadataResponse = z.infer<typeof metadataSchema>;
  // TODO: antipattern
  const isUsingAnthropic = llmClient.type === "anthropic";

  const extractionResponse = await llmClient.createChatCompletion({
    options: {
      messages: [
        buildExtractSystemPrompt(
          isUsingAnthropic,
          isUsingTextExtract,
          userProvidedInstructions,
        ),
        buildExtractUserPrompt(instruction, domElements, isUsingAnthropic),
      ],
      response_model: {
        schema: schema,
        name: "Extraction",
      },
      temperature: 0.1,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      requestId,
    },
    logger,
  });

  const refinedResponse =
    await llmClient.createChatCompletion<ExtractionResponse>({
      options: {
        messages: [
          buildRefineSystemPrompt(),
          buildRefineUserPrompt(
            instruction,
            previouslyExtractedContent,
            extractionResponse,
          ),
        ],
        response_model: {
          schema: schema,
          name: "RefinedExtraction",
        },
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        requestId,
      },
      logger,
    });

  const metadataSchema = z.object({
    progress: z
      .string()
      .describe(
        "progress of what has been extracted so far, as concise as possible",
      ),
    completed: z
      .boolean()
      .describe(
        "true if the goal is now accomplished. Use this conservatively, only when you are sure that the goal has been completed.",
      ),
  });

  const metadataResponse =
    await llmClient.createChatCompletion<MetadataResponse>({
      options: {
        messages: [
          buildMetadataSystemPrompt(),
          buildMetadataPrompt(
            instruction,
            refinedResponse,
            chunksSeen,
            chunksTotal,
          ),
        ],
        response_model: {
          name: "Metadata",
          schema: metadataSchema,
        },
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        requestId,
      },
      logger,
    });

  return {
    ...refinedResponse,
    metadata: metadataResponse,
  };
}

export async function observe({
  instruction,
  domElements,
  llmClient,
  requestId,
  isUsingAccessibilityTree,
  userProvidedInstructions,
  logger,
  returnAction = false,
}: {
  instruction: string;
  domElements: string;
  llmClient: LLMClient;
  requestId: string;
  userProvidedInstructions?: string;
  logger: (message: LogLine) => void;
  isUsingAccessibilityTree?: boolean;
  returnAction?: boolean;
}) {
  const observeSchema = z.object({
    elements: z
      .array(
        z.object({
          elementId: z.number().describe("the number of the element"),
          description: z
            .string()
            .describe(
              isUsingAccessibilityTree
                ? "a description of the accessible element and its purpose"
                : "a description of the element and what it is relevant for",
            ),
          ...(returnAction
            ? {
                method: z
                  .string()
                  .describe(
                    "the candidate method/action to interact with the element. Select one of the available Playwright interaction methods.",
                  ),
                arguments: z.array(
                  z
                    .string()
                    .describe(
                      "the arguments to pass to the method. For example, for a click, the arguments are empty, but for a fill, the arguments are the value to fill in.",
                    ),
                ),
              }
            : {}),
        }),
      )
      .describe(
        isUsingAccessibilityTree
          ? "an array of accessible elements that match the instruction"
          : "an array of elements that match the instruction",
      ),
  });

  type ObserveResponse = z.infer<typeof observeSchema>;

  const observationResponse =
    await llmClient.createChatCompletion<ObserveResponse>({
      options: {
        messages: [
          buildObserveSystemPrompt(
            userProvidedInstructions,
            isUsingAccessibilityTree,
          ),
          buildObserveUserMessage(
            instruction,
            domElements,
            isUsingAccessibilityTree,
          ),
        ],
        response_model: {
          schema: observeSchema,
          name: "Observation",
        },
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        requestId,
      },
      logger,
    });
  const parsedResponse = {
    elements:
      observationResponse.elements?.map((el) => {
        const base = {
          elementId: Number(el.elementId),
          description: String(el.description),
        };

        return returnAction
          ? {
              ...base,
              method: String(el.method),
              arguments: el.arguments,
            }
          : base;
      }) ?? [],
  } satisfies { elements: { elementId: number; description: string }[] };

  return parsedResponse;
}
