import {
  JSONValue,
  LanguageModelV3CallOptions,
  TypeValidationError,
} from '@ai-sdk/provider';
import {
  asSchema,
  FlexibleSchema,
  resolve,
  safeParseJSON,
  safeValidateTypes,
} from '@ai-sdk/provider-utils';
import { NoObjectGeneratedError } from '../error/no-object-generated-error';
import { FinishReason } from '../types/language-model';
import { LanguageModelResponseMetadata } from '../types/language-model-response-metadata';
import { LanguageModelUsage } from '../types/usage';
import { DeepPartial } from '../util/deep-partial';
import { parsePartialJson } from '../util/parse-partial-json';
import { EnrichedStreamPart } from './stream-text';

export interface Output<OUTPUT = any, PARTIAL = any, ELEMENT = any> {
  /**
   * The name of the output mode.
   */
  name: string;

  /**
   * The response format to use for the model.
   */
  responseFormat: PromiseLike<LanguageModelV3CallOptions['responseFormat']>;

  /**
   * Parses the complete output of the model.
   */
  parseCompleteOutput(
    options: { text: string },
    context: {
      response: LanguageModelResponseMetadata;
      usage: LanguageModelUsage;
      finishReason: FinishReason;
    },
  ): Promise<OUTPUT>;

  /**
   * Parses the partial output of the model.
   */
  parsePartialOutput(options: {
    text: string;
  }): Promise<{ partial: PARTIAL } | undefined>;

  /**
   * Creates a stream transform that emits individual elements as they complete.
   */
  createElementStreamTransform():
    | TransformStream<EnrichedStreamPart<any, PARTIAL>, ELEMENT>
    | undefined;
}

/**
 * Output specification for text generation.
 * This is the default output mode that generates plain text.
 *
 * @returns An output specification for generating text.
 */
export const text = (): Output<string, string, never> => ({
  name: 'text',
  responseFormat: Promise.resolve({ type: 'text' }),

  async parseCompleteOutput({ text }: { text: string }) {
    return text;
  },

  async parsePartialOutput({ text }: { text: string }) {
    return { partial: text };
  },

  createElementStreamTransform() {
    return undefined;
  },
});

/**
 * Output specification for typed object generation using schemas.
 * When the model generates a text response, it will return an object that matches the schema.
 *
 * @param schema - The schema of the object to generate.
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating objects with the specified schema.
 */
export const object = <OBJECT>({
  schema: inputSchema,
  name,
  description,
}: {
  schema: FlexibleSchema<OBJECT>;
  /**
   * Optional name of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
   */
  name?: string;
  /**
   * Optional description of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
   */
  description?: string;
}): Output<OBJECT, DeepPartial<OBJECT>, never> => {
  const schema = asSchema(inputSchema);

  return {
    name: 'object',

    responseFormat: resolve(schema.jsonSchema).then(jsonSchema => ({
      type: 'json' as const,
      schema: jsonSchema,
      ...(name != null && { name }),
      ...(description != null && { description }),
    })),

    async parseCompleteOutput(
      { text }: { text: string },
      context: {
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
      },
    ) {
      const parseResult = await safeParseJSON({ text });

      if (!parseResult.success) {
        throw new NoObjectGeneratedError({
          message: 'No object generated: could not parse the response.',
          cause: parseResult.error,
          text,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason,
        });
      }

      const validationResult = await safeValidateTypes({
        value: parseResult.value,
        schema,
      });

      if (!validationResult.success) {
        throw new NoObjectGeneratedError({
          message: 'No object generated: response did not match schema.',
          cause: validationResult.error,
          text,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason,
        });
      }

      return validationResult.value;
    },

    async parsePartialOutput({ text }: { text: string }) {
      const result = await parsePartialJson(text);

      switch (result.state) {
        case 'failed-parse':
        case 'undefined-input': {
          return undefined;
        }

        case 'repaired-parse':
        case 'successful-parse': {
          return {
            // Note: currently no validation of partial results:
            partial: result.value as DeepPartial<OBJECT>,
          };
        }
      }
    },

    createElementStreamTransform() {
      return undefined;
    },
  };
};

/**
 * Output specification for array generation.
 * When the model generates a text response, it will return an array of elements.
 *
 * @param element - The schema of the array elements to generate.
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating an array of elements.
 */
export const array = <ELEMENT>({
  element: inputElementSchema,
  name,
  description,
}: {
  element: FlexibleSchema<ELEMENT>;
  /**
   * Optional name of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
   */
  name?: string;
  /**
   * Optional description of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
   */
  description?: string;
}): Output<Array<ELEMENT>, Array<ELEMENT>, ELEMENT> => {
  const elementSchema = asSchema(inputElementSchema);

  return {
    name: 'array',

    // JSON schema that describes an array of elements:
    responseFormat: resolve(elementSchema.jsonSchema).then(jsonSchema => {
      // remove $schema from schema.jsonSchema:
      const { $schema, ...itemSchema } = jsonSchema;

      return {
        type: 'json' as const,
        schema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            elements: { type: 'array', items: itemSchema },
          },
          required: ['elements'],
          additionalProperties: false,
        },
        ...(name != null && { name }),
        ...(description != null && { description }),
      };
    }),

    async parseCompleteOutput(
      { text }: { text: string },
      context: {
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
      },
    ) {
      const parseResult = await safeParseJSON({ text });

      if (!parseResult.success) {
        throw new NoObjectGeneratedError({
          message: 'No object generated: could not parse the response.',
          cause: parseResult.error,
          text,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason,
        });
      }

      const outerValue = parseResult.value;

      if (
        outerValue == null ||
        typeof outerValue !== 'object' ||
        !('elements' in outerValue) ||
        !Array.isArray(outerValue.elements)
      ) {
        throw new NoObjectGeneratedError({
          message: 'No object generated: response did not match schema.',
          cause: new TypeValidationError({
            value: outerValue,
            cause: 'response must be an object with an elements array',
          }),
          text,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason,
        });
      }

      for (const element of outerValue.elements) {
        const validationResult = await safeValidateTypes({
          value: element,
          schema: elementSchema,
        });

        if (!validationResult.success) {
          throw new NoObjectGeneratedError({
            message: 'No object generated: response did not match schema.',
            cause: validationResult.error,
            text,
            response: context.response,
            usage: context.usage,
            finishReason: context.finishReason,
          });
        }
      }

      return outerValue.elements as Array<ELEMENT>;
    },

    async parsePartialOutput({ text }: { text: string }) {
      const result = await parsePartialJson(text);

      switch (result.state) {
        case 'failed-parse':
        case 'undefined-input': {
          return undefined;
        }

        case 'repaired-parse':
        case 'successful-parse': {
          const outerValue = result.value;

          // no parsable elements array
          if (
            outerValue == null ||
            typeof outerValue !== 'object' ||
            !('elements' in outerValue) ||
            !Array.isArray(outerValue.elements)
          ) {
            return undefined;
          }

          const rawElements =
            result.state === 'repaired-parse' && outerValue.elements.length > 0
              ? outerValue.elements.slice(0, -1)
              : outerValue.elements;

          const parsedElements: Array<ELEMENT> = [];
          for (const rawElement of rawElements) {
            const validationResult = await safeValidateTypes({
              value: rawElement,
              schema: elementSchema,
            });

            if (validationResult.success) {
              parsedElements.push(validationResult.value);
            }
          }

          return { partial: parsedElements };
        }
      }
    },

    createElementStreamTransform() {
      let publishedElements = 0;

      return new TransformStream<
        EnrichedStreamPart<any, Array<ELEMENT>>,
        ELEMENT
      >({
        transform({ partialOutput }, controller) {
          if (partialOutput != null) {
            // Only enqueue new elements that haven't been published yet
            for (
              ;
              publishedElements < partialOutput.length;
              publishedElements++
            ) {
              controller.enqueue(partialOutput[publishedElements]);
            }
          }
        },
      });
    },
  };
};

/**
 * Output specification for choice generation.
 * When the model generates a text response, it will return a one of the choice options.
 *
 * @param options - The available choices.
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating a choice.
 */
export const choice = <CHOICE extends string>({
  options: choiceOptions,
  name,
  description,
}: {
  options: Array<CHOICE>;
  /**
   * Optional name of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
   */
  name?: string;
  /**
   * Optional description of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
   */
  description?: string;
}): Output<CHOICE, CHOICE, never> => {
  return {
    name: 'choice',

    // JSON schema that describes an enumeration:
    responseFormat: Promise.resolve({
      type: 'json',
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          result: { type: 'string', enum: choiceOptions },
        },
        required: ['result'],
        additionalProperties: false,
      },
      ...(name != null && { name }),
      ...(description != null && { description }),
    } as const),

    async parseCompleteOutput(
      { text }: { text: string },
      context: {
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
      },
    ) {
      const parseResult = await safeParseJSON({ text });

      if (!parseResult.success) {
        throw new NoObjectGeneratedError({
          message: 'No object generated: could not parse the response.',
          cause: parseResult.error,
          text,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason,
        });
      }

      const outerValue = parseResult.value;

      if (
        outerValue == null ||
        typeof outerValue !== 'object' ||
        !('result' in outerValue) ||
        typeof outerValue.result !== 'string' ||
        !choiceOptions.includes(outerValue.result as any)
      ) {
        throw new NoObjectGeneratedError({
          message: 'No object generated: response did not match schema.',
          cause: new TypeValidationError({
            value: outerValue,
            cause: 'response must be an object that contains a choice value.',
          }),
          text,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason,
        });
      }

      return outerValue.result as CHOICE;
    },

    async parsePartialOutput({ text }: { text: string }) {
      const result = await parsePartialJson(text);

      switch (result.state) {
        case 'failed-parse':
        case 'undefined-input': {
          return undefined;
        }

        case 'repaired-parse':
        case 'successful-parse': {
          const outerValue = result.value;

          if (
            outerValue == null ||
            typeof outerValue !== 'object' ||
            !('result' in outerValue) ||
            typeof outerValue.result !== 'string'
          ) {
            return undefined;
          }

          // list of potential matches.
          const potentialMatches = choiceOptions.filter(choiceOption =>
            choiceOption.startsWith(outerValue.result as string),
          );

          if (result.state === 'successful-parse') {
            // successful parse: exact choice value
            return potentialMatches.includes(outerValue.result as any)
              ? { partial: outerValue.result as CHOICE }
              : undefined;
          } else {
            // repaired parse: only return if not ambiguous
            return potentialMatches.length === 1
              ? { partial: potentialMatches[0] as CHOICE }
              : undefined;
          }
        }
      }
    },

    createElementStreamTransform() {
      return undefined;
    },
  };
};

/**
 * Output specification for unstructured JSON generation.
 * When the model generates a text response, it will return a JSON object.
 *
 * @param name - Optional name of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema name.
 * @param description - Optional description of the output that should be generated. Used by some providers for additional LLM guidance, e.g. via tool or schema description.
 *
 * @returns An output specification for generating JSON.
 */
export const json = ({
  name,
  description,
}: {
  /**
   * Optional name of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema name.
   */
  name?: string;
  /**
   * Optional description of the output that should be generated.
   * Used by some providers for additional LLM guidance, e.g. via tool or schema description.
   */
  description?: string;
} = {}): Output<JSONValue, JSONValue, never> => {
  return {
    name: 'json',

    responseFormat: Promise.resolve({
      type: 'json' as const,
      ...(name != null && { name }),
      ...(description != null && { description }),
    }),

    async parseCompleteOutput(
      { text }: { text: string },
      context: {
        response: LanguageModelResponseMetadata;
        usage: LanguageModelUsage;
        finishReason: FinishReason;
      },
    ) {
      const parseResult = await safeParseJSON({ text });

      if (!parseResult.success) {
        throw new NoObjectGeneratedError({
          message: 'No object generated: could not parse the response.',
          cause: parseResult.error,
          text,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason,
        });
      }

      return parseResult.value;
    },

    async parsePartialOutput({ text }: { text: string }) {
      const result = await parsePartialJson(text);

      switch (result.state) {
        case 'failed-parse':
        case 'undefined-input': {
          return undefined;
        }

        case 'repaired-parse':
        case 'successful-parse': {
          return result.value === undefined
            ? undefined
            : { partial: result.value };
        }
      }
    },

    createElementStreamTransform() {
      return undefined;
    },
  };
};
