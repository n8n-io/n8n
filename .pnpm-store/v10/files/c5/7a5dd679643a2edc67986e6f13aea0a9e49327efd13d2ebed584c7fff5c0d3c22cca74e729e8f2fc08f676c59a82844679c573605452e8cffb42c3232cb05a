import { ZodNumberDef } from 'zod/v3';

export type JsonSchema7NumberType = {
  type: 'number' | 'integer';
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
};

export function parseNumberDef(def: ZodNumberDef): JsonSchema7NumberType {
  const res: JsonSchema7NumberType = {
    type: 'number',
  };

  if (!def.checks) return res;

  for (const check of def.checks) {
    switch (check.kind) {
      case 'int':
        res.type = 'integer';
        break;
      case 'min':
        if (check.inclusive) {
          res.minimum = check.value;
        } else {
          res.exclusiveMinimum = check.value;
        }
        break;
      case 'max':
        if (check.inclusive) {
          res.maximum = check.value;
        } else {
          res.exclusiveMaximum = check.value;
        }
        break;
      case 'multipleOf':
        res.multipleOf = check.value;
        break;
    }
  }
  return res;
}
