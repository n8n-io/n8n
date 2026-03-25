import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { ResponseFormat } from "../models/components/responseformat.js";
import * as components from "../models/components/index.js";

export function transformToChatCompletionRequest<T extends z.ZodTypeAny>(
  parsedRequest: ParsedChatCompletionRequest<T>
): components.ChatCompletionRequest {
  const { responseFormat, ...rest } = parsedRequest;

  // Transform responseFormat from z.ZodType to ResponseFormat
  const transformedResponseFormat: ResponseFormat | undefined = responseFormatFromZodObject(responseFormat);

  return {
    ...rest,
    responseFormat: transformedResponseFormat,
  };
}

export type ParsedChatCompletionRequest<T extends z.ZodTypeAny> = Omit<components.ChatCompletionRequest, 'responseFormat'> & {
  responseFormat: T;
};

export type ParsedAssistantMessage<T extends z.ZodTypeAny> = components.AssistantMessage & {
  parsed?: z.infer<T> | undefined;
}

export type ParsedChatCompletionChoice<T extends z.ZodTypeAny> = Omit<components.ChatCompletionChoice, 'message'> & {
  message?: ParsedAssistantMessage<T> | undefined;
};

export type ParsedChatCompletionResponse<T extends z.ZodTypeAny> = Omit<components.ChatCompletionResponse, 'choices'> & {
  choices?: Array<ParsedChatCompletionChoice<T>> | undefined;
};


export function convertToParsedChatCompletionResponse<T extends z.ZodTypeAny>(response: components.ChatCompletionResponse, responseFormat: T): ParsedChatCompletionResponse<T> {
  if (response.choices === undefined || response.choices.length === 0) {
    return {
      ...response,
      choices: response.choices === undefined ? undefined : [],
    };
  }
  const parsedChoices: Array<ParsedChatCompletionChoice<T>> = [];
  for (const _choice of response.choices) {
    if (_choice.message === null || typeof _choice.message === 'undefined') {
      parsedChoices.push({..._choice, message: undefined});
    } else {
      if (_choice.message.content !== null && typeof _choice.message.content !== 'undefined' && !Array.isArray(_choice.message.content)) {
      parsedChoices.push({
        ..._choice,
        message: {
          ..._choice.message,
          parsed: responseFormat.safeParse(JSON.parse(_choice.message.content)).data,
        }
      });
      }
    }
  }
  return {
    ...response,
    choices: parsedChoices,
  };

}

  // Function to convert Zod schema to strict JSON schema
export function responseFormatFromZodObject<T extends z.ZodTypeAny>(responseFormat: T): ResponseFormat {
  const responseJsonSchema = zodToJsonSchema(responseFormat);
  // It is not possible to get the variable name of a Zod object at runtime in TypeScript so we're using a placeholder name.
  // This has not impact on the parsing as the initial Zod object is used to parse the response.
  const placeholderName = "placeholderName"
  return {
    type: "json_schema",
    jsonSchema: {
      name: placeholderName,
      schemaDefinition: responseJsonSchema,
      strict: true,
    },
  };
}