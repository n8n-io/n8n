import type { JSONSchema7 } from 'json-schema';

export interface Options {
  readonly skipNonRequired?: boolean;
  readonly skipReadOnly?: boolean;
  readonly skipWriteOnly?: boolean;
  readonly quiet?: boolean;
  readonly enablePatterns?: boolean;
  readonly format?: 'json' | 'xml';
}

export function sample(schema: JSONSchema7, options?: Options, document?: object): unknown;
