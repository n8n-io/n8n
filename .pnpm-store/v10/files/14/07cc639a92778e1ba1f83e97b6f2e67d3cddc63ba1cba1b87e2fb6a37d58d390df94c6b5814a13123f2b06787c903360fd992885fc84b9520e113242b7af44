import { ZodSchema, ZodTypeDef } from 'zod/v3';
import { Refs, Seen } from './refs';
import { JsonSchema7Type } from './parse-types';

export type DateStrategy =
  | 'format:date-time'
  | 'format:date'
  | 'string'
  | 'integer';

export const ignoreOverride = Symbol(
  'Let zodToJsonSchema decide on which parser to use',
);

export type OverrideCallback = (
  def: ZodTypeDef,
  refs: Refs,
  seen: Seen | undefined,
  forceResolution?: boolean,
) => JsonSchema7Type | undefined | typeof ignoreOverride;

export type PostProcessCallback = (
  jsonSchema: JsonSchema7Type | undefined,
  def: ZodTypeDef,
  refs: Refs,
) => JsonSchema7Type | undefined;

export const jsonDescription: PostProcessCallback = (jsonSchema, def) => {
  if (def.description) {
    try {
      return {
        ...jsonSchema,
        ...JSON.parse(def.description),
      };
    } catch {}
  }

  return jsonSchema;
};

export type Options = {
  name: string | undefined;
  $refStrategy: 'root' | 'relative' | 'none' | 'seen';
  basePath: string[];
  effectStrategy: 'input' | 'any';
  pipeStrategy: 'input' | 'output' | 'all';
  dateStrategy: DateStrategy | DateStrategy[];
  mapStrategy: 'entries' | 'record';
  removeAdditionalStrategy: 'passthrough' | 'strict';
  allowedAdditionalProperties: true | undefined;
  rejectedAdditionalProperties: false | undefined;
  strictUnions: boolean;
  definitionPath: string;
  definitions: Record<string, ZodSchema>;
  errorMessages: boolean;
  patternStrategy: 'escape' | 'preserve';
  applyRegexFlags: boolean;
  emailStrategy: 'format:email' | 'format:idn-email' | 'pattern:zod';
  base64Strategy: 'format:binary' | 'contentEncoding:base64' | 'pattern:zod';
  nameStrategy: 'ref' | 'title';
  override?: OverrideCallback;
  postProcess?: PostProcessCallback;
};

export const defaultOptions: Options = {
  name: undefined,
  $refStrategy: 'root',
  basePath: ['#'],
  effectStrategy: 'input',
  pipeStrategy: 'all',
  dateStrategy: 'format:date-time',
  mapStrategy: 'entries',
  removeAdditionalStrategy: 'passthrough',
  allowedAdditionalProperties: true,
  rejectedAdditionalProperties: false,
  definitionPath: 'definitions',
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  patternStrategy: 'escape',
  applyRegexFlags: false,
  emailStrategy: 'format:email',
  base64Strategy: 'contentEncoding:base64',
  nameStrategy: 'ref',
};

export const getDefaultOptions = (
  options: Partial<Options> | string | undefined,
) =>
  (typeof options === 'string'
    ? {
        ...defaultOptions,
        name: options,
      }
    : {
        ...defaultOptions,
        ...options,
      }) as Options;
