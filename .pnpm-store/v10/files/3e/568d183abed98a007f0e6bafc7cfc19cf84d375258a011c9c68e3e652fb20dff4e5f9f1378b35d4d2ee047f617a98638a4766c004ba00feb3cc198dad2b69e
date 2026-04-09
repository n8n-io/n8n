import { ZodBigIntDef } from 'zod/v3';

export type JsonSchema7BigintType = {
  type: 'integer';
  format: 'int64';
  minimum?: BigInt;
  exclusiveMinimum?: BigInt;
  maximum?: BigInt;
  exclusiveMaximum?: BigInt;
  multipleOf?: BigInt;
};

export function parseBigintDef(def: ZodBigIntDef): JsonSchema7BigintType {
  const res: JsonSchema7BigintType = {
    type: 'integer',
    format: 'int64',
  };

  if (!def.checks) return res;

  for (const check of def.checks) {
    switch (check.kind) {
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
