import Decimal from 'decimal.js';
import { describe, expect, test } from 'vitest';
import { LosslessNumber, isLosslessNumber, parse, parseNumberAndBigInt, reviveDate, stringify } from './index';
import { isDeepEqual } from './parse';
// helper function to create a lossless number
function lln(value) {
  return new LosslessNumber(value);
}

// deepEqual objects compared as plain JSON instead of JavaScript classes
function expectDeepEqual(a, b) {
  expect(jsonify(a)).toEqual(jsonify(b));
}

// turn a JavaScript object into plain JSON
function jsonify(obj) {
  return JSON.parse(JSON.stringify(obj));
}
test('full JSON object', () => {
  const text = '{"a":2.3e100,"b":"str","c":null,"d":false,"e":[1,2,3]}';
  const expected = {
    a: lln('2.3e100'),
    b: 'str',
    c: null,
    d: false,
    e: [lln('1'), lln('2'), lln('3')]
  };
  const parsed = parse(text);
  expect(jsonify(parsed)).toEqual(jsonify(expected));
});
test('object', () => {
  expect(parse('{}')).toEqual({});
  expect(parse('  { \n } \t ')).toEqual({});
  expect(parse('{"a": {}}')).toEqual({
    a: {}
  });
  expect(parse('{"a": "b"}')).toEqual({
    a: 'b'
  });
  expect(parse('{"a": 2}')).toEqual({
    a: lln('2')
  });
});
test('array', () => {
  expect(parse('[]')).toEqual([]);
  expect(parse('[{}]')).toEqual([{}]);
  expect(parse('{"a":[]}')).toEqual({
    a: []
  });
  expect(parse('[1, "hi", true, false, null, {}, []]')).toEqual([lln('1'), 'hi', true, false, null, {}, []]);
});
test('number', () => {
  expect(isLosslessNumber(parse('2.3e500'))).toBe(true);
  expect(isLosslessNumber(parse('123456789012345678901234567890'))).toBe(true);
  expect(parse('23')).toEqual(lln('23'));
  expect(parse('0')).toEqual(lln('0'));
  expect(parse('0e+2')).toEqual(lln('0e+2'));
  expect(parse('0e+2').valueOf()).toEqual(0);
  expect(parse('0.0')).toEqual(lln('0.0'));
  expect(parse('-0')).toEqual(lln('-0'));
  expect(parse('2.3')).toEqual(lln('2.3'));
  expect(parse('2300e3')).toEqual(lln('2300e3'));
  expect(parse('2300e+3')).toEqual(lln('2300e+3'));
  expect(parse('-2')).toEqual(lln('-2'));
  expect(parse('2e-3')).toEqual(lln('2e-3'));
  expect(parse('2.3e-3')).toEqual(lln('2.3e-3'));
});
test('LosslessNumber', () => {
  const str = '22222222222222222222';
  expectDeepEqual(parse(str), lln(str));
  const str2 = '2.3e+500';
  expectDeepEqual(parse(str2), lln(str2));
  const str3 = '2.3e-500';
  expectDeepEqual(parse(str3), lln(str3));
});
test('string', () => {
  expect(parse('"str"')).toEqual('str');
  expect(JSON.parse('"\\"\\\\\\/\\b\\f\\n\\r\\t"')).toEqual('"\\/\b\f\n\r\t');
  expect(parse('"\\"\\\\\\/\\b\\f\\n\\r\\t"')).toEqual('"\\/\b\f\n\r\t');
  expect(JSON.parse('"\\u260E"')).toEqual('\u260E');
  expect(parse('"\\u260E"')).toEqual('\u260E');
});
test('keywords', () => {
  expect(parse('true')).toEqual(true);
  expect(parse('false')).toEqual(false);
  expect(parse('null')).toEqual(null);
});
test('reviver - replace values', () => {
  const text = '{"a":123,"b":"str"}';
  const expected = {
    type: 'object',
    value: {
      a: {
        type: 'object',
        value: lln('123')
      },
      b: {
        type: 'string',
        value: 'str'
      }
    }
  };
  function reviver(_key, value) {
    return {
      type: typeof value,
      value
    };
  }
  expect(parse(text, reviver)).toEqual(expected);
});
test('reviver - invoke callbacks with key/value and correct context', () => {
  const text = '{"a":123,"b":"str","c":null,"22":22,"d":false,"e":[1,2,3]}';
  const expected = [{
    context: {
      22: 22,
      a: 123,
      b: 'str',
      c: null,
      d: false,
      e: [1, 2, 3]
    },
    key: '22',
    // ordered first
    value: 22
  }, {
    context: {
      22: 22,
      a: 123,
      b: 'str',
      c: null,
      d: false,
      e: [1, 2, 3]
    },
    key: 'a',
    value: 123
  }, {
    context: {
      22: 22,
      a: 123,
      b: 'str',
      c: null,
      d: false,
      e: [1, 2, 3]
    },
    key: 'b',
    value: 'str'
  }, {
    context: {
      22: 22,
      a: 123,
      b: 'str',
      c: null,
      d: false,
      e: [1, 2, 3]
    },
    key: 'c',
    value: null
  }, {
    context: {
      22: 22,
      a: 123,
      b: 'str',
      c: null,
      d: false,
      e: [1, 2, 3]
    },
    key: 'd',
    value: false
  }, {
    context: [1, 2, 3],
    key: '0',
    value: 1
  }, {
    context: [1, 2, 3],
    key: '1',
    value: 2
  }, {
    context: [1, null, 3],
    key: '2',
    value: 3
  }, {
    context: {
      22: 22,
      a: 123,
      b: 'str',
      c: null,
      e: [1, null, 3]
    },
    key: 'e',
    value: [1, null, 3]
  }, {
    context: {
      '': {
        22: 22,
        a: 123,
        b: 'str',
        c: null,
        e: [1, null, 3]
      }
    },
    key: '',
    value: {
      22: 22,
      a: 123,
      b: 'str',
      c: null,
      e: [1, null, 3]
    }
  }];

  // convert LosslessNumbers to numbers for easy comparison with native JSON
  function toRegularJSON(json) {
    const str = stringify(json);
    return str !== undefined ? JSON.parse(str) : undefined;
  }
  function reviver(key, value) {
    return key === 'd' ? undefined : key === '1' ? null : value;
  }

  // validate expected outcome against reference implemenation JSON.parse
  const logsReference = [];
  JSON.parse(text, function (key, value) {
    logsReference.push({
      context: toRegularJSON(this),
      key,
      value
    });
    return reviver(key, value);
  });
  const logsActual = [];
  parse(text, function (key, value) {
    logsActual.push({
      // @ts-expect-error
      context: toRegularJSON(this),
      key,
      value: toRegularJSON(value)
    });
    return reviver(key, value);
  });
  expect(logsReference).toEqual(expected);
  expect(logsActual).toEqual(expected);
});
test('correctly handle strings equaling a JSON delimiter', () => {
  expect(parse('""')).toEqual('');
  expect(parse('"["')).toEqual('[');
  expect(parse('"]"')).toEqual(']');
  expect(parse('"{"')).toEqual('{');
  expect(parse('"}"')).toEqual('}');
  expect(parse('":"')).toEqual(':');
  expect(parse('","')).toEqual(',');
});
test('reviver - revive a lossless number correctly', () => {
  const text = '2.3e+500';
  const expected = [{
    key: '',
    value: lln('2.3e+500')
  }];
  const logs = [];
  parse(text, (key, value) => {
    logs.push({
      key,
      value
    });
    return value;
  });
  expectDeepEqual(logs, expected);
});
test('parse with a custom number parser creating bigint', () => {
  const json = parse('[123456789123456789123456789, 2.3, 123]', null, parseNumberAndBigInt);
  expect(json).toEqual([123456789123456789123456789n, 2.3, 123n]);
});
test('parse with a reviver to parse Date', () => {
  const json = parse('["2022-08-25T09:39:19.288Z"]', reviveDate);
  expect(json).toEqual([new Date('2022-08-25T09:39:19.288Z')]);
});
test('parse with a custom number parser creating Decimal', () => {
  const parseDecimal = value => new Decimal(value);
  const json = parse('[123456789123456789123456789,2.3,123]', null, parseDecimal);
  expect(json).toEqual([new Decimal('123456789123456789123456789'), new Decimal('2.3'), new Decimal('123')]);
});
test('supports unicode characters in a string', () => {
  expect(parse('"★"')).toBe('★');
  expect(parse('"😀"')).toBe('😀');
  expect(parse('"\ud83d\ude00"')).toBe('\ud83d\ude00');
  expect(parse('"йнформация"')).toBe('йнформация');
});
test('supports escaped unicode characters in a string', () => {
  expect(parse('"\\u2605"')).toBe('\u2605');
  expect(parse('"\\ud83d\\ude00"')).toBe('\ud83d\ude00');
  expect(parse('"\\u0439\\u043d\\u0444\\u043e\\u0440\\u043c\\u0430\\u0446\\u0438\\u044f"')).toBe('\u0439\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f');
});
test('supports unicode characters in a key', () => {
  expect(parse('{"★":true}')).toStrictEqual({
    '★': true
  });
  expect(parse('{"\u2605":true}')).toStrictEqual({
    '\u2605': true
  });
  expect(parse('{"😀":true}')).toStrictEqual({
    '😀': true
  });
  expect(parse('{"\ud83d\ude00":true}')).toStrictEqual({
    '\ud83d\ude00': true
  });
});
test('throws an error when an invalid character is encountered in a string', () => {
  expect(() => parse('"\n"')).toThrow("Invalid character '\n' at position 1");
  expect(() => parse('"\t"')).toThrow("Invalid character '\t' at position 1");
});
test('throws an error when an invalid character is encountered in a key', () => {
  expect(() => parse('{"\n":true}')).toThrow("Invalid character '\n' at position 2");
  expect(() => parse('{"\t":true}')).toThrow("Invalid character '\t' at position 2");
});
test('throws an error when a duplicate key is encountered', () => {
  expect(() => parse('{"name": "Joe", "name": "Sarah"}')).toThrow("Duplicate key 'name' encountered at position 17");
});
test('does not throw a duplicate key error for build in methods like toString', () => {
  expect(parse('{"toString": "test"}')).toEqual({
    toString: 'test'
  });
});
test('does not throw a duplicate key error when the values are equal', () => {
  expect(parse('{"name": "Joe", "name": "Joe"}')).toStrictEqual({
    name: 'Joe'
  });
  expect(parse('{"name": "Joe", "name": "Joe", "name": "Joe"}')).toStrictEqual({
    name: 'Joe'
  });
  expect(parse('{"age": 41, "age": 41}')).toStrictEqual({
    age: new LosslessNumber('41')
  });
  expect(parse('{"address": {"city": "Rotterdam"}, "address": {"city": "Rotterdam"}}')).toStrictEqual({
    address: {
      city: 'Rotterdam'
    }
  });
  expect(parse('{"scores": [2.3, 7.1], "scores": [2.3, 7.1]}')).toStrictEqual({
    scores: [new LosslessNumber('2.3'), new LosslessNumber('7.1')]
  });
  expect(parse('{"scores": [2.3, 7.1], "scores": [2.3, 7.1]}', null, Number.parseFloat)).toStrictEqual({
    scores: [2.3, 7.1]
  });
});
test('throw a duplicate key error when using a build in method name twice', () => {
  expect(() => parse('{"toString": 1, "toString": 2}')).toThrow("Duplicate key 'toString' encountered at position 17");
});
describe('throw meaningful exceptions', () => {
  const cases = [{
    input: '',
    expectedError: 'JSON value expected but reached end of input at position 0'
  }, {
    input: '  ',
    expectedError: 'JSON value expected but reached end of input at position 2'
  }, {
    input: '{',
    expectedError: "Quoted object key or end of object '}' expected but reached end of input at position 1"
  }, {
    input: '{"a",',
    expectedError: "Colon ':' expected after property name but got ',' at position 4"
  }, {
    input: '{"a":}',
    expectedError: "Object value expected after ':' at position 5"
  }, {
    input: '{a:2}',
    expectedError: "Quoted object key expected but got 'a' at position 1"
  }, {
    input: '{"a":2,}',
    expectedError: "Quoted object key expected but got '}' at position 7"
  }, {
    input: '{"a" "b"}',
    expectedError: "Colon ':' expected after property name but got '\"' at position 5"
  }, {
    input: '{"a":2 "b":3}',
    expectedError: "Comma ',' expected after value but got '\"' at position 7"
  }, {
    input: '{}{}',
    expectedError: "Expected end of input but got '{' at position 2"
  }, {
    input: '[',
    expectedError: "Array item or end of array ']' expected but reached end of input at position 1"
  }, {
    input: '[2,]',
    expectedError: "Array item expected but got ']' at position 3"
  }, {
    input: '[2,,3]',
    expectedError: "Array item expected but got ',' at position 3"
  }, {
    input: '[2 3]',
    expectedError: "Comma ',' expected after value but got '3' at position 3"
  }, {
    input: '2.3.4',
    expectedError: "Expected end of input but got '.' at position 3"
  }, {
    input: '2..3',
    expectedError: "Invalid number '2.', expecting a digit but got '.' at position 2"
  }, {
    input: '2e3.4',
    expectedError: "Expected end of input but got '.' at position 3"
  }, {
    input: '2e',
    expectedError: "Invalid number '2e', expecting a digit but reached end of input at position 2"
  }, {
    input: '-',
    expectedError: "Invalid number '-', expecting a digit but reached end of input at position 1"
  }, {
    input: '"a',
    expectedError: "End of string '\"' expected but reached end of input at position 2"
  }, {
    input: 'foo',
    expectedError: "JSON value expected but got 'f' at position 0"
  }, {
    input: '"\\a"',
    expectedError: "Invalid escape character '\\a' at position 1"
  }, {
    input: '"\\u2',
    expectedError: "Invalid unicode character '\\u2' at position 1"
  }, {
    input: '"\\u26',
    expectedError: "Invalid unicode character '\\u26' at position 1"
  }, {
    input: '"\\u260',
    expectedError: "Invalid unicode character '\\u260' at position 1"
  }, {
    input: '"\\u2605',
    expectedError: "End of string '\"' expected but reached end of input at position 7"
  }, {
    input: '{"s \\ud',
    expectedError: "Invalid unicode character '\\ud' at position 4"
  }, {
    input: '"\\u26"',
    expectedError: "Invalid unicode character '\\u26\"' at position 1"
  }, {
    input: '"\\uZ000"',
    expectedError: "Invalid unicode character '\\uZ000' at position 1"
  }];
  for (const {
    input,
    expectedError
  } of cases) {
    test(`should throw when parsing '${input}'`, () => {
      expect(() => parse(input)).toThrow(expectedError);
    });
  }
});
describe('isDeepEqual', () => {
  test('should test equality of primitive values', () => {
    expect(isDeepEqual(2, 3)).toEqual(false);
    expect(isDeepEqual(2, 2)).toEqual(true);
    expect(isDeepEqual(2.4, 2.4)).toEqual(true);
    expect(isDeepEqual(true, true)).toEqual(true);
    expect(isDeepEqual(false, false)).toEqual(true);
    expect(isDeepEqual(true, false)).toEqual(false);
    expect(isDeepEqual(null, null)).toEqual(true);
    expect(isDeepEqual(undefined, undefined)).toEqual(true);
    expect(isDeepEqual(undefined, null)).toEqual(false);
    expect(isDeepEqual(0, null)).toEqual(false);
    expect(isDeepEqual('hello', 'hello')).toEqual(true);
    expect(isDeepEqual('hello', 'there')).toEqual(false);
    expect(isDeepEqual(new LosslessNumber('2'), new LosslessNumber('2'))).toEqual(true);
  });
  test('should test equality of arrays', () => {
    expect(isDeepEqual([1, 2], [1, 2])).toEqual(true);
    expect(isDeepEqual([1, 2], [1, 3])).toEqual(false);
    expect(isDeepEqual([1, 2], [3, 2])).toEqual(false);
    expect(isDeepEqual([1, 2], [1, 2, 3])).toEqual(false);
    expect(isDeepEqual([1, 2, 3], [1, 2])).toEqual(false);
  });
  test('should test equality of objects', () => {
    expect(isDeepEqual({
      a: 2,
      b: 3
    }, {
      a: 2,
      b: 3
    })).toEqual(true);
    expect(isDeepEqual({
      a: 2,
      b: 3
    }, {
      a: 2,
      b: 4
    })).toEqual(false);
    expect(isDeepEqual({
      a: 2,
      b: 3
    }, {
      a: 4,
      b: 3
    })).toEqual(false);
    expect(isDeepEqual({
      a: 2
    }, {
      a: 2,
      b: 3
    })).toEqual(false);
    expect(isDeepEqual({
      a: 2,
      b: 3
    }, {
      a: 2
    })).toEqual(false);
  });
  test('should test equality of nested objects / arrays', () => {
    expect(isDeepEqual({
      values: [1, 2]
    }, {
      values: [1, 2]
    })).toEqual(true);
    expect(isDeepEqual({
      values: [1, 2]
    }, {
      values: [1, 2],
      b: 3
    })).toEqual(false);
    expect(isDeepEqual({
      values: [1, 3]
    }, {
      values: [1, 2]
    })).toEqual(false);
    expect(isDeepEqual([{
      id: 2
    }], [{
      id: 2
    }])).toEqual(true);
    expect(isDeepEqual([{
      id: 2
    }], [{
      id: 3
    }])).toEqual(false);
  });
});
//# sourceMappingURL=parse.test.js.map