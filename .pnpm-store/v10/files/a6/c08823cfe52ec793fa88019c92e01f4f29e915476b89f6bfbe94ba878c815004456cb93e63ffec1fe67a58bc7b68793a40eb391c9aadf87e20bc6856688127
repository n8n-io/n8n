import { ZodSchema } from 'zod/v3';
import { Options } from './options';
import { parseDef } from './parse-def';
import { JsonSchema7Type } from './parse-types';
import { getRefs } from './refs';
import { parseAnyDef } from './parsers/any';

const zod3ToJsonSchema = (
  schema: ZodSchema<any>,
  options?: Partial<Options> | string,
): JsonSchema7Type & {
  $schema?: string;
  definitions?: {
    [key: string]: JsonSchema7Type;
  };
} => {
  const refs = getRefs(options);

  let definitions =
    typeof options === 'object' && options.definitions
      ? Object.entries(options.definitions).reduce(
          (acc: { [key: string]: JsonSchema7Type }, [name, schema]) => ({
            ...acc,
            [name]:
              parseDef(
                schema._def,
                {
                  ...refs,
                  currentPath: [...refs.basePath, refs.definitionPath, name],
                },
                true,
              ) ?? parseAnyDef(),
          }),
          {},
        )
      : undefined;

  const name =
    typeof options === 'string'
      ? options
      : options?.nameStrategy === 'title'
        ? undefined
        : options?.name;

  const main =
    parseDef(
      schema._def,
      name === undefined
        ? refs
        : {
            ...refs,
            currentPath: [...refs.basePath, refs.definitionPath, name],
          },
      false,
    ) ?? (parseAnyDef() as JsonSchema7Type);

  const title =
    typeof options === 'object' &&
    options.name !== undefined &&
    options.nameStrategy === 'title'
      ? options.name
      : undefined;

  if (title !== undefined) {
    main.title = title;
  }

  const combined: ReturnType<typeof zod3ToJsonSchema> =
    name === undefined
      ? definitions
        ? {
            ...main,
            [refs.definitionPath]: definitions,
          }
        : main
      : {
          $ref: [
            ...(refs.$refStrategy === 'relative' ? [] : refs.basePath),
            refs.definitionPath,
            name,
          ].join('/'),
          [refs.definitionPath]: {
            ...definitions,
            [name]: main,
          },
        };

  combined.$schema = 'http://json-schema.org/draft-07/schema#';

  return combined;
};

export { zod3ToJsonSchema };
