import { ZodTypeDef } from 'zod/v3';
import { getDefaultOptions, Options } from './options';
import { JsonSchema7Type } from './parse-types';

export type Refs = {
  seen: Map<ZodTypeDef, Seen>;
  currentPath: string[];
  propertyPath: string[] | undefined;
} & Options;

export type Seen = {
  def: ZodTypeDef;
  path: string[];
  jsonSchema: JsonSchema7Type | undefined;
};

export const getRefs = (options?: string | Partial<Options>): Refs => {
  const _options = getDefaultOptions(options);
  const currentPath =
    _options.name !== undefined
      ? [..._options.basePath, _options.definitionPath, _options.name]
      : _options.basePath;
  return {
    ..._options,
    currentPath: currentPath,
    propertyPath: undefined,
    seen: new Map(
      Object.entries(_options.definitions).map(([name, def]) => [
        def._def,
        {
          def: def._def,
          path: [..._options.basePath, _options.definitionPath, name],
          // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
          jsonSchema: undefined,
        },
      ]),
    ),
  };
};
