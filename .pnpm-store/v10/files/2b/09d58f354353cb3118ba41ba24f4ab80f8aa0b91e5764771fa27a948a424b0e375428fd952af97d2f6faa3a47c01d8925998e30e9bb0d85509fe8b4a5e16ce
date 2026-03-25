import {
  transformToChatCompletionRequest,
  convertToParsedChatCompletionResponse,
  responseFormatFromZodObject,
  ParsedChatCompletionRequest,
  ParsedChatCompletionResponse,
} from "../../extra/structChat";
import { ResponseFormat } from "../../models/components/responseformat.js";
import { z } from "zod";
import * as components from "../../models/components/index.js";

const Explanation = z.object({
  explanation: z.string(),
  output: z.string(),
});

const MathDemonstration = z.object({
  steps: z.array(Explanation),
  final_answer: z.string(),
});

const raw_request: ParsedChatCompletionRequest<typeof MathDemonstration> = {
  model: "mistral-tiny-latest",
  messages: [
    {
      role: "system",
      content:
        "You are a helpful math tutor. You will be provided with a math problem, and your goal will be to output a step by step solution, along with a final answer. For each step, just provide the output as an equation use the explanation field to detail the reasoning.",
    },
    { role: "user", content: "How can I solve 8x + 7 = -23" },
  ],
  responseFormat: MathDemonstration,
};

const transformedResponseFormat: ResponseFormat = {
  type: "json_schema",
  jsonSchema: {
    name: "placeholderName",
    schemaDefinition: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              explanation: { type: "string" },
              output: { type: "string" },
            },
            required: ["explanation", "output"],
            additionalProperties: false,
          },
        },
        final_answer: { type: "string" },
      },
      required: ["steps", "final_answer"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
    strict: true,
  },
};

const ccr_request: components.ChatCompletionRequest = {
  model: "mistral-tiny-latest",
  messages: [
    {
      role: "system",
      content:
        "You are a helpful math tutor. You will be provided with a math problem, and your goal will be to output a step by step solution, along with a final answer. For each step, just provide the output as an equation use the explanation field to detail the reasoning.",
    },
    { role: "user", content: "How can I solve 8x + 7 = -23" },
  ],
  responseFormat: transformedResponseFormat,
};

const raw_response: components.ChatCompletionResponse = {
  id: "df9c5af85d0a4474b2e8392ee52dd883",
  object: "chat.completion",
  model: "mistral-tiny-latest",
  usage: { promptTokens: 71, completionTokens: 140, totalTokens: 211 },
  created: 1737982851,
  choices: [
    {
      index: 0,
      message: {
        content: `
{
  "steps": [
    {
      "explanation": "Subtract 7 from both sides to isolate the term with x.",
      "output": "8x + 7 - 7 = -23 - 7"
    },
    {
      "explanation": "Simplify both sides to get the equation in standard form.",
      "output": "8x = -30"
    },
    {
      "explanation": "Divide both sides by 8 to solve for x.",
      "output": "8x / 8 = -30 / 8"
    }
  ],
  "final_answer": "-3.75"
}
`,
        toolCalls: null,
        prefix: false,
        role: "assistant",
      },
      finishReason: "stop",
    },
  ],
};

const ccr_response: ParsedChatCompletionResponse<typeof MathDemonstration> = {
  id: "df9c5af85d0a4474b2e8392ee52dd883",
  object: "chat.completion",
  model: "mistral-tiny-latest",
  usage: { promptTokens: 71, completionTokens: 140, totalTokens: 211 },
  created: 1737982851,
  choices: [
    {
      index: 0,
      message: {
        content: `
{
  "steps": [
    {
      "explanation": "Subtract 7 from both sides to isolate the term with x.",
      "output": "8x + 7 - 7 = -23 - 7"
    },
    {
      "explanation": "Simplify both sides to get the equation in standard form.",
      "output": "8x = -30"
    },
    {
      "explanation": "Divide both sides by 8 to solve for x.",
      "output": "8x / 8 = -30 / 8"
    }
  ],
  "final_answer": "-3.75"
}
`,
        toolCalls: null,
        prefix: false,
        role: "assistant",
        parsed: {
          steps: [
            {
              explanation:
                "Subtract 7 from both sides to isolate the term with x.",
              output: "8x + 7 - 7 = -23 - 7",
            },
            {
              explanation:
                "Simplify both sides to get the equation in standard form.",
              output: "8x = -30",
            },
            {
              explanation: "Divide both sides by 8 to solve for x.",
              output: "8x / 8 = -30 / 8",
            },
          ],
          final_answer: "-3.75",
        },
      },
      finishReason: "stop",
    },
  ],
};

describe("transformToChatCompletionRequest", () => {
  it("should return a valid ChatCompletionRequest", () => {
    expect(transformToChatCompletionRequest(raw_request)).toStrictEqual(
      ccr_request
    );
  });
});

describe("convertToParsedChatCompletionResponse", () => {
  it("should return a valid ParsedChatCompletionResponse", () => {
    expect(
      convertToParsedChatCompletionResponse(raw_response, MathDemonstration)
    ).toStrictEqual(ccr_response);
  });
});

describe("responseFormatFromZodObject", () => {
  it("should return a valid response format", () => {
    expect(responseFormatFromZodObject(MathDemonstration)).toStrictEqual(
      transformedResponseFormat
    );
  });
});
