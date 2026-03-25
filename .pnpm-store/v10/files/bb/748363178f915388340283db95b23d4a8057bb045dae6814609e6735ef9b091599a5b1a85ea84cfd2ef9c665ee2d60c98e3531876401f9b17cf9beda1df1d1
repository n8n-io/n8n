export function sampleNumber(schema) {
  let res = 0;
  if (schema.type === 'number' && (schema.format === 'float' || schema.format === 'double')) {
    res = 0.1;
  }
  if (typeof schema.exclusiveMinimum === 'boolean' || typeof schema.exclusiveMaximum === 'boolean') { //legacy support for jsonschema draft 4 of exclusiveMaximum/exclusiveMinimum as booleans
    if (schema.maximum && schema.minimum) {
      res = schema.exclusiveMinimum ? Math.floor(schema.minimum) + 1 : schema.minimum;
      if ((schema.exclusiveMaximum && res >= schema.maximum) ||
        ((!schema.exclusiveMaximum && res > schema.maximum))) {
        res = (schema.maximum + schema.minimum) / 2;
      }
      return res;
    }
    if (schema.minimum) {
      if (schema.exclusiveMinimum) {
        return Math.floor(schema.minimum) + 1;
      } else {
        return schema.minimum;
      }
    }
    if (schema.maximum) {
      if (schema.exclusiveMaximum) {
        return (schema.maximum > 0) ? 0 : Math.floor(schema.maximum) - 1;
      } else {
        return (schema.maximum > 0) ? 0 : schema.maximum;
      }
    }
  } else {
    if (schema.minimum) {
      return schema.minimum;
    }
    if (schema.exclusiveMinimum) {
      res = Math.floor(schema.exclusiveMinimum) + 1;

      if (res === schema.exclusiveMaximum) {
        res = (res + Math.floor(schema.exclusiveMaximum) - 1) / 2;
      }
    } else if (schema.exclusiveMaximum) {
      res = Math.floor(schema.exclusiveMaximum) - 1;
    } else if (schema.maximum) {
      res = schema.maximum;
    }
  }

  return res;
}
