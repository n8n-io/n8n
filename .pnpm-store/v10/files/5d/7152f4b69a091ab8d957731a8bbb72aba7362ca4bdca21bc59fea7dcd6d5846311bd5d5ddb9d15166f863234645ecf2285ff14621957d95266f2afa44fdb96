import { ZodDateDef } from 'zod/v3';
import { Refs } from '../refs';
import { DateStrategy } from '../options';

export type JsonSchema7DateType =
  | {
      type: 'integer' | 'string';
      format: 'unix-time' | 'date-time' | 'date';
      minimum?: number;
      maximum?: number;
    }
  | {
      anyOf: JsonSchema7DateType[];
    };

export function parseDateDef(
  def: ZodDateDef,
  refs: Refs,
  overrideDateStrategy?: DateStrategy,
): JsonSchema7DateType {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;

  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef(def, refs, item)),
    };
  }

  switch (strategy) {
    case 'string':
    case 'format:date-time':
      return {
        type: 'string',
        format: 'date-time',
      };
    case 'format:date':
      return {
        type: 'string',
        format: 'date',
      };
    case 'integer':
      return integerDateParser(def);
  }
}

const integerDateParser = (def: ZodDateDef) => {
  const res: JsonSchema7DateType = {
    type: 'integer',
    format: 'unix-time',
  };

  for (const check of def.checks) {
    switch (check.kind) {
      case 'min':
        res.minimum = check.value;
        break;
      case 'max':
        res.maximum = check.value;
        break;
    }
  }

  return res;
};
