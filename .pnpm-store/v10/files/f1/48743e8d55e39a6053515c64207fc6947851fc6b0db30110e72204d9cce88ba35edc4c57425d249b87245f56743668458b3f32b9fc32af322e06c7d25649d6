import {
  fieldNonEmpty,
  matchesJsonSchemaType,
  missingRequiredField,
  oasTypeOf,
  getAdditionalPropertiesOption,
} from '../utils';

describe('field-non-empty', () => {
  it('should match expected message', () => {
    const message = fieldNonEmpty('Car', 'color');
    expect(message).toBe('Car object `color` must be non-empty string.');
  });
});

describe('matches-json-schema-type', () => {
  it('should report true on a null value with nullable type', () => {
    const results = matchesJsonSchemaType(null, 'string', true);
    expect(results).toBe(true);
  });

  it('should report true on a value and type integer', () => {
    const results = matchesJsonSchemaType(123, 'integer', false);
    expect(results).toBe(true);
  });

  it('should report false when the value is not integer and type is integer', () => {
    const results = matchesJsonSchemaType(3.14, 'integer', false);
    expect(results).toBe(false);
  });

  it('should report true when the value is a number and type is number', () => {
    const results = matchesJsonSchemaType(3.14, 'number', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is an integer and type is number', () => {
    const results = matchesJsonSchemaType(3, 'number', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is true and type is boolean', () => {
    const results = matchesJsonSchemaType(true, 'boolean', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is false and type is boolean', () => {
    const results = matchesJsonSchemaType(false, 'boolean', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is a string and type is boolean', () => {
    const results = matchesJsonSchemaType('test', 'boolean', false);
    expect(results).toBe(false);
  });

  it('should report true on an array value with array type', () => {
    const results = matchesJsonSchemaType(['foo', 'bar'], 'array', false);
    expect(results).toBe(true);
  });

  it('should report false on an array value with object type', () => {
    const results = matchesJsonSchemaType(['foo', 'bar'], 'object', false);
    expect(results).toBe(false);
  });

  it('should report true on an object value with object type', () => {
    const car = { type: 'Fiat', model: '500', color: 'white' };
    const results = matchesJsonSchemaType(car, 'object', true);
    expect(results).toBe(true);
  });

  it('should report false on an object value with array type', () => {
    const car = { type: 'Fiat', model: '500', color: 'white' };
    const results = matchesJsonSchemaType(car, 'array', true);
    expect(results).toBe(false);
  });
});

describe('missing-required-field', () => {
  it('should match expected message for missing required field', () => {
    const message = missingRequiredField('Car', 'color');
    expect(message).toBe('Car object should contain `color` field.');
  });
});

describe('oas-type-of', () => {
  it('should report the correct oas type for a string', () => {
    const results = oasTypeOf('word');
    expect(results).toBe('string');
  });

  it('should report the correct oas type for an integer', () => {
    const results = oasTypeOf(123);
    expect(results).toBe('integer');
  });

  it('should report the correct oas type for a number', () => {
    const results = oasTypeOf(3.14);
    expect(results).toBe('number');
  });

  it('should report the correct oas type for a null value', () => {
    const results = oasTypeOf(null);
    expect(results).toBe('null');
  });

  it('should report the correct oas type for a true boolean', () => {
    const results = oasTypeOf(true);
    expect(results).toBe('boolean');
  });

  it('should report the correct oas type for a false boolean', () => {
    const results = oasTypeOf(false);
    expect(results).toBe('boolean');
  });

  it('should report the correct oas type for an array', () => {
    const results = oasTypeOf(['foo', 'bar']);
    expect(results).toBe('array');
  });

  it('should report the correct oas type for an object', () => {
    const car = { type: 'Fiat', model: '500', color: 'white' };
    const results = oasTypeOf(car);
    expect(results).toBe('object');
  });
});

describe('get-additional-properties-option', () => {
  it('should return actual option', () => {
    const options = {
      allowAdditionalProperties: true,
    };
    expect(getAdditionalPropertiesOption(options)).toBeTruthy();
  });

  it('should reverse option', () => {
    const options = {
      disallowAdditionalProperties: true,
    };
    expect(getAdditionalPropertiesOption(options)).toBeFalsy();
  });

  it('should throw error with message', () => {
    const options = {
      allowAdditionalProperties: true,
      disallowAdditionalProperties: false,
    };

    try {
      getAdditionalPropertiesOption(options);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual(
        "Do not use 'disallowAdditionalProperties' field. Use 'allowAdditionalProperties' instead. \n"
      );
    }
  });
});
