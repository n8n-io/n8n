import {
  isJSONArray,
  isJSONObject,
  JSONObject,
  JSONSchema7,
  JSONValue,
  TypeValidationError,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import {
  asSchema,
  FlexibleSchema,
  safeValidateTypes,
  Schema,
  ValidationResult,
} from '@ai-sdk/provider-utils';
import { NoObjectGeneratedError } from '../error/no-object-generated-error';
import {
  FinishReason,
  LanguageModelResponseMetadata,
  LanguageModelUsage,
} from '../types';
import {
  AsyncIterableStream,
  createAsyncIterableStream,
} from '../util/async-iterable-stream';
import { DeepPartial } from '../util/deep-partial';
import { ObjectStreamPart } from './stream-object-result';

export interface OutputStrategy<PARTIAL, RESULT, ELEMENT_STREAM> {
  readonly type: 'object' | 'array' | 'enum' | 'no-schema';

  jsonSchema(): Promise<JSONSchema7 | undefined>;

  validatePartialResult({
    value,
    textDelta,
    isFinalDelta,
  }: {
    value: JSONValue;
    textDelta: string;
    isFirstDelta: boolean;
    isFinalDelta: boolean;
    latestObject: PARTIAL | undefined;
  }): Promise<
    ValidationResult<{
      partial: PARTIAL;
      textDelta: string;
    }>
  >;
  validateFinalResult(
    value: JSONValue | undefined,
    context: {
      text: string;
      response: LanguageModelResponseMetadata;
      usage: LanguageModelUsage;
    },
  ): Promise<ValidationResult<RESULT>>;

  createElementStream(
    originalStream: ReadableStream<ObjectStreamPart<PARTIAL>>,
  ): ELEMENT_STREAM;
}

const noSchemaOutputStrategy: OutputStrategy<JSONValue, JSONValue, never> = {
  type: 'no-schema',
  jsonSchema: async () => undefined,

  async validatePartialResult({ value, textDelta }) {
    return { success: true, value: { partial: value, textDelta } };
  },

  async validateFinalResult(
    value: JSONValue | undefined,
    context: {
      text: string;
      response: LanguageModelResponseMetadata;
      usage: LanguageModelUsage;
      finishReason: FinishReason;
    },
  ): Promise<ValidationResult<JSONValue>> {
    return value === undefined
      ? {
          success: false,
          error: new NoObjectGeneratedError({
            message: 'No object generated: response did not match schema.',
            text: context.text,
            response: context.response,
            usage: context.usage,
            finishReason: context.finishReason,
          }),
        }
      : { success: true, value };
  },

  createElementStream() {
    throw new UnsupportedFunctionalityError({
      functionality: 'element streams in no-schema mode',
    });
  },
};

const objectOutputStrategy = <OBJECT>(
  schema: Schema<OBJECT>,
): OutputStrategy<DeepPartial<OBJECT>, OBJECT, never> => ({
  type: 'object',
  jsonSchema: async () => await schema.jsonSchema,

  async validatePartialResult({ value, textDelta }) {
    return {
      success: true,
      value: {
        // Note: currently no validation of partial results:
        partial: value as DeepPartial<OBJECT>,
        textDelta,
      },
    };
  },

  async validateFinalResult(
    value: JSONValue | undefined,
  ): Promise<ValidationResult<OBJECT>> {
    return safeValidateTypes({ value, schema });
  },

  createElementStream() {
    throw new UnsupportedFunctionalityError({
      functionality: 'element streams in object mode',
    });
  },
});

const arrayOutputStrategy = <ELEMENT>(
  schema: Schema<ELEMENT>,
): OutputStrategy<ELEMENT[], ELEMENT[], AsyncIterableStream<ELEMENT>> => {
  return {
    type: 'array',

    // wrap in object that contains array of elements, since most LLMs will not
    // be able to generate an array directly:
    // possible future optimization: use arrays directly when model supports grammar-guided generation
    jsonSchema: async () => {
      // remove $schema from schema.jsonSchema:
      const { $schema, ...itemSchema } = await schema.jsonSchema;

      return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          elements: { type: 'array', items: itemSchema },
        },
        required: ['elements'],
        additionalProperties: false,
      };
    },

    async validatePartialResult({
      value,
      latestObject,
      isFirstDelta,
      isFinalDelta,
    }) {
      // check that the value is an object that contains an array of elements:
      if (!isJSONObject(value) || !isJSONArray(value.elements)) {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause: 'value must be an object that contains an array of elements',
          }),
        };
      }

      const inputArray = value.elements as Array<JSONObject>;
      const resultArray: Array<ELEMENT> = [];

      for (let i = 0; i < inputArray.length; i++) {
        const element = inputArray[i];
        const result = await safeValidateTypes({ value: element, schema });

        // special treatment for last processed element:
        // ignore parse or validation failures, since they indicate that the
        // last element is incomplete and should not be included in the result,
        // unless it is the final delta
        if (i === inputArray.length - 1 && !isFinalDelta) {
          continue;
        }

        if (!result.success) {
          return result;
        }

        resultArray.push(result.value);
      }

      // calculate delta:
      const publishedElementCount = latestObject?.length ?? 0;

      let textDelta = '';

      if (isFirstDelta) {
        textDelta += '[';
      }

      if (publishedElementCount > 0) {
        textDelta += ',';
      }

      textDelta += resultArray
        .slice(publishedElementCount) // only new elements
        .map(element => JSON.stringify(element))
        .join(',');

      if (isFinalDelta) {
        textDelta += ']';
      }

      return {
        success: true,
        value: {
          partial: resultArray,
          textDelta,
        },
      };
    },

    async validateFinalResult(
      value: JSONValue | undefined,
    ): Promise<ValidationResult<Array<ELEMENT>>> {
      // check that the value is an object that contains an array of elements:
      if (!isJSONObject(value) || !isJSONArray(value.elements)) {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause: 'value must be an object that contains an array of elements',
          }),
        };
      }

      const inputArray = value.elements as Array<JSONObject>;

      // check that each element in the array is of the correct type:
      for (const element of inputArray) {
        const result = await safeValidateTypes({ value: element, schema });
        if (!result.success) {
          return result;
        }
      }

      return { success: true, value: inputArray as Array<ELEMENT> };
    },

    createElementStream(
      originalStream: ReadableStream<ObjectStreamPart<ELEMENT[]>>,
    ) {
      let publishedElements = 0;

      return createAsyncIterableStream(
        originalStream.pipeThrough(
          new TransformStream<ObjectStreamPart<ELEMENT[]>, ELEMENT>({
            transform(chunk, controller) {
              switch (chunk.type) {
                case 'object': {
                  const array = chunk.object;

                  // publish new elements one by one:
                  for (
                    ;
                    publishedElements < array.length;
                    publishedElements++
                  ) {
                    controller.enqueue(array[publishedElements]);
                  }

                  break;
                }

                case 'text-delta':
                case 'finish':
                case 'error': // suppress error (use onError instead)
                  break;

                default: {
                  const _exhaustiveCheck: never = chunk;
                  throw new Error(
                    `Unsupported chunk type: ${_exhaustiveCheck}`,
                  );
                }
              }
            },
          }),
        ),
      );
    },
  };
};

const enumOutputStrategy = <ENUM extends string>(
  enumValues: Array<ENUM>,
): OutputStrategy<string, ENUM, never> => {
  return {
    type: 'enum',

    // wrap in object that contains result, since most LLMs will not
    // be able to generate an enum value directly:
    // possible future optimization: use enums directly when model supports top-level enums
    jsonSchema: async () => ({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        result: { type: 'string', enum: enumValues },
      },
      required: ['result'],
      additionalProperties: false,
    }),

    async validateFinalResult(
      value: JSONValue | undefined,
    ): Promise<ValidationResult<ENUM>> {
      // check that the value is an object that contains an array of elements:
      if (!isJSONObject(value) || typeof value.result !== 'string') {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause:
              'value must be an object that contains a string in the "result" property.',
          }),
        };
      }

      const result = value.result as string;

      return enumValues.includes(result as ENUM)
        ? { success: true, value: result as ENUM }
        : {
            success: false,
            error: new TypeValidationError({
              value,
              cause: 'value must be a string in the enum',
            }),
          };
    },

    async validatePartialResult({ value, textDelta }) {
      if (!isJSONObject(value) || typeof value.result !== 'string') {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause:
              'value must be an object that contains a string in the "result" property.',
          }),
        };
      }

      const result = value.result as string;
      const possibleEnumValues = enumValues.filter(enumValue =>
        enumValue.startsWith(result),
      );

      if (value.result.length === 0 || possibleEnumValues.length === 0) {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause: 'value must be a string in the enum',
          }),
        };
      }

      return {
        success: true,
        value: {
          partial:
            possibleEnumValues.length > 1 ? result : possibleEnumValues[0],
          textDelta,
        },
      };
    },

    createElementStream() {
      // no streaming in enum mode
      throw new UnsupportedFunctionalityError({
        functionality: 'element streams in enum mode',
      });
    },
  };
};

export function getOutputStrategy<SCHEMA>({
  output,
  schema,
  enumValues,
}: {
  output: 'object' | 'array' | 'enum' | 'no-schema';
  schema?: FlexibleSchema<SCHEMA>;
  enumValues?: Array<SCHEMA>;
}): OutputStrategy<any, any, any> {
  switch (output) {
    case 'object':
      return objectOutputStrategy(asSchema(schema!));
    case 'array':
      return arrayOutputStrategy(asSchema(schema!));
    case 'enum':
      return enumOutputStrategy(enumValues! as Array<string>);
    case 'no-schema':
      return noSchemaOutputStrategy;
    default: {
      const _exhaustiveCheck: never = output;
      throw new Error(`Unsupported output: ${_exhaustiveCheck}`);
    }
  }
}
