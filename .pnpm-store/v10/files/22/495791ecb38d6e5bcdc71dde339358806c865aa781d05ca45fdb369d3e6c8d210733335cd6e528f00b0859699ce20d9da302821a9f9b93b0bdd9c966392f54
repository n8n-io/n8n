import { describe, expect, test } from 'vitest';
import { compareNumber, countSignificantDigits, extractSignificantDigits, getUnsafeNumberReason, isInteger, isNumber, isSafeNumber, splitNumber, toSafeNumberOrThrow, UnsafeNumberReason } from './utils';
test('isInteger', () => {
  expect(isInteger('4250')).toEqual(true);
  expect(isInteger('-4250')).toEqual(true);
  expect(isInteger('2.345')).toEqual(false);
});
test('isNumber', () => {
  expect(isNumber('4250')).toEqual(true);
  expect(isNumber('-4250')).toEqual(true);
  expect(isNumber('2.345')).toEqual(true);
  expect(isNumber('2.345e3')).toEqual(true);
  expect(isNumber('2.345e+3')).toEqual(true);
  expect(isNumber('2.345e-3')).toEqual(true);
  expect(isNumber('2.3450e-3')).toEqual(true);
  expect(isNumber('-2.3450e-3')).toEqual(true);
});
test('isSafeNumber', () => {
  expect(isSafeNumber('0')).toEqual(true);
  expect(isSafeNumber('0.0')).toEqual(true);
  expect(isSafeNumber('2.3')).toEqual(true);
  expect(isSafeNumber('2.3e4')).toEqual(true);
  expect(isSafeNumber('-2.3e4')).toEqual(true);
  expect(isSafeNumber('1234567890')).toEqual(true);
  expect(isSafeNumber('0.30000000000000004')).toEqual(true);
  expect(isSafeNumber('0.9999999999999999')).toEqual(true);
  expect(isSafeNumber('2e500')).toEqual(false);
  expect(isSafeNumber('-2e500')).toEqual(false);
  expect(isSafeNumber('2e-500')).toEqual(false);
  expect(isSafeNumber('0.66666666666666666667')).toEqual(false);
  expect(isSafeNumber('12345678901234567890')).toEqual(false);
  expect(isSafeNumber('0.30000000000000000004')).toEqual(false);
  expect(isSafeNumber('10038000307000729')).toEqual(false); // is parsed into 10038000307000728 (wrongly rounded)
  expect(isSafeNumber('1.2345678901234567890')).toEqual(false);
  expect(isSafeNumber('0.99999999999999999')).toEqual(false);

  // the following number loses formatting, but the value stays the same and hence is safe
  expect(isSafeNumber('2.300')).toEqual(true);

  // test edge cases around MAX_SAFE_INTEGER
  expect(isSafeNumber('9007199254740991')).toEqual(true); // Number.MAX_SAFE_INTEGER
  expect(isSafeNumber('9007199254740992')).toEqual(false); // Number.MAX_SAFE_INTEGER + 1
  expect(isSafeNumber('9007199254740993')).toEqual(false); // Number.MAX_SAFE_INTEGER + 2
  expect(isSafeNumber('-9007199254740991')).toEqual(true); // Number.MIN_SAFE_INTEGER
  expect(isSafeNumber('-9007199254740992')).toEqual(false); // Number.MIN_SAFE_INTEGER + 1
  expect(isSafeNumber('-9007199254740993')).toEqual(false); // Number.MIN_SAFE_INTEGER + 2
});
test('isSafeNumber({ approx: false })', () => {
  expect(isSafeNumber('0.66666666666666666667', {
    approx: false
  })).toEqual(false);
  expect(isSafeNumber('1.2345678901234567890', {
    approx: false
  })).toEqual(false);
  expect(isSafeNumber('1.2345678901234567890', {
    approx: false
  })).toEqual(false);
});
test('isSafeNumber({ approx: true })', () => {
  expect(isSafeNumber('2.3', {
    approx: true
  })).toEqual(true);
  expect(isSafeNumber('2.3e4', {
    approx: true
  })).toEqual(true);
  expect(isSafeNumber('1234567890', {
    approx: true
  })).toEqual(true);
  expect(isSafeNumber('0.66666666666666666667', {
    approx: true
  })).toEqual(true);
  expect(isSafeNumber('0.666666666666667', {
    approx: true
  })).toEqual(true);
  expect(isSafeNumber('0.66666666666667', {
    approx: true
  })).toEqual(true);
  expect(isSafeNumber('0.2345678901234567890', {
    approx: true
  })).toEqual(true);
  // expect(isSafeNumber('0.99999999999999999', { approx: true })).toEqual(true) // TODO: this becomes 1
  // expect(isSafeNumber('0.3000000000000000004', { approx: true })).toEqual(true) // TODO: this becomes 0.3

  expect(isSafeNumber('2e500', {
    approx: true
  })).toEqual(false);
  expect(isSafeNumber('2e-500', {
    approx: true
  })).toEqual(false);
  expect(isSafeNumber('12345678901234567890', {
    approx: true
  })).toEqual(false);
});
test('getUnsafeNumberReason', () => {
  expect(getUnsafeNumberReason('123')).toBe(undefined);
  expect(getUnsafeNumberReason('0.666666667')).toBe(undefined);
  expect(getUnsafeNumberReason('1e500')).toBe(UnsafeNumberReason.overflow);
  expect(getUnsafeNumberReason('1e-500')).toBe(UnsafeNumberReason.underflow);
  expect(getUnsafeNumberReason('12345678901234567890')).toBe(UnsafeNumberReason.truncate_integer);
  expect(getUnsafeNumberReason('0.66666666666666666667')).toBe(UnsafeNumberReason.truncate_float);
});
test('toSafeNumberOrThrow', () => {
  expect(toSafeNumberOrThrow('123')).toBe(123);
  expect(toSafeNumberOrThrow('0.666666667')).toBe(0.666666667);
  expect(() => toSafeNumberOrThrow('1e500')).toThrow("Cannot safely convert to number: the value '1e500' would overflow and become Infinity");
  expect(() => toSafeNumberOrThrow('1e-500')).toThrow("Cannot safely convert to number: the value '1e-500' would underflow and become 0");
  expect(() => toSafeNumberOrThrow('12345678901234567890')).toThrow("Cannot safely convert to number: the value '12345678901234567890' would truncate and become 12345678901234567000");
  expect(() => toSafeNumberOrThrow('0.66666666666666666667')).toThrow("Cannot safely convert to number: the value '0.66666666666666666667' would truncate and become 0.6666666666666666");
});
test('toSafeNumberOrThrow({ approx: true })', () => {
  expect(toSafeNumberOrThrow('123', {
    approx: true
  })).toBe(123);
  expect(toSafeNumberOrThrow('0.666666667', {
    approx: true
  })).toBe(0.666666667);
  expect(() => toSafeNumberOrThrow('1e500', {
    approx: true
  })).toThrow("Cannot safely convert to number: the value '1e500' would overflow and become Infinity");
  expect(() => toSafeNumberOrThrow('1e-500', {
    approx: true
  })).toThrow("Cannot safely convert to number: the value '1e-500' would underflow and become 0");
  expect(() => toSafeNumberOrThrow('12345678901234567890', {
    approx: true
  })).toThrow("Cannot safely convert to number: the value '12345678901234567890' would truncate and become 12345678901234567000");
  expect(toSafeNumberOrThrow('0.66666666666666666667', {
    approx: true
  })).toBe(0.6666666666666666);
});
describe('splitNumber', () => {
  test.each([{
    value: '0',
    expected: {
      sign: '',
      digits: '0',
      exponent: 0
    }
  }, {
    value: '1',
    expected: {
      sign: '',
      digits: '1',
      exponent: 0
    }
  }, {
    value: '2.3',
    expected: {
      sign: '',
      digits: '23',
      exponent: 0
    }
  }, {
    value: '23.50',
    expected: {
      sign: '',
      digits: '235',
      exponent: 1
    }
  }, {
    value: '-2.3',
    expected: {
      sign: '-',
      digits: '23',
      exponent: 0
    }
  }, {
    value: '02.3',
    expected: {
      sign: '',
      digits: '23',
      exponent: 0
    }
  }, {
    value: '2300',
    expected: {
      sign: '',
      digits: '23',
      exponent: 3
    }
  }, {
    value: '0.00023',
    expected: {
      sign: '',
      digits: '23',
      exponent: -4
    }
  }, {
    value: '000.0002300',
    expected: {
      sign: '',
      digits: '23',
      exponent: -4
    }
  }, {
    value: '002300',
    expected: {
      sign: '',
      digits: '23',
      exponent: 3
    }
  }, {
    value: '2.3e3',
    expected: {
      sign: '',
      digits: '23',
      exponent: 3
    }
  }, {
    value: '2.3E3',
    expected: {
      sign: '',
      digits: '23',
      exponent: 3
    }
  }, {
    value: '2.3e+3',
    expected: {
      sign: '',
      digits: '23',
      exponent: 3
    }
  }, {
    value: '-2.3e3',
    expected: {
      sign: '-',
      digits: '23',
      exponent: 3
    }
  }, {
    value: '23e3',
    expected: {
      sign: '',
      digits: '23',
      exponent: 4
    }
  }, {
    value: '-23e3',
    expected: {
      sign: '-',
      digits: '23',
      exponent: 4
    }
  }, {
    value: '2.3e-3',
    expected: {
      sign: '',
      digits: '23',
      exponent: -3
    }
  }, {
    value: '23e-3',
    expected: {
      sign: '',
      digits: '23',
      exponent: -2
    }
  }, {
    value: '000e+003',
    expected: {
      sign: '',
      digits: '0',
      exponent: 3
    }
  }, {
    value: '-23e-3',
    expected: {
      sign: '-',
      digits: '23',
      exponent: -2
    }
  }, {
    value: '99.99',
    expected: {
      sign: '',
      digits: '9999',
      exponent: 1
    }
  }, {
    value: '-01200',
    expected: {
      sign: '-',
      digits: '12',
      exponent: 3
    }
  }])('splitNumber($value) -> {sign: $expected.sign, digits: $expected.digits, exponent: $expected.exponent}', _ref => {
    let {
      value,
      expected
    } = _ref;
    expect(splitNumber(value)).toEqual(expected);
  });
  test('should throw an error when splitting invalid input', () => {
    expect(() => splitNumber('')).toThrow('Invalid number');
    expect(() => splitNumber('2.3.4')).toThrow('Invalid number');
    expect(() => splitNumber('2e3.2')).toThrow('Invalid number');
    expect(() => splitNumber('+2e3')).toThrow('Invalid number');
    expect(() => splitNumber('  2  ')).toThrow('Invalid number');
    expect(() => splitNumber('2a')).toThrow('Invalid number');
    expect(() => splitNumber('--2')).toThrow('Invalid number');
  });
});
describe('compareNumber', () => {
  test.each([{
    a: '0',
    b: '0',
    expected: 0
  }, {
    a: '-0',
    b: '-0',
    expected: 0
  }, {
    a: '-0',
    b: '0',
    expected: 0
  }, {
    a: '0',
    b: '-0',
    expected: 0
  }, {
    a: '1',
    b: '1',
    expected: 0
  }, {
    a: '2',
    b: '3',
    expected: -1
  }, {
    a: '3',
    b: '2',
    expected: 1
  }, {
    a: '-3',
    b: '4',
    expected: -1
  }, {
    a: '-3',
    b: '-4',
    expected: 1
  }, {
    a: '3',
    b: '-4',
    expected: 1
  }, {
    a: '777',
    b: '8',
    expected: 1
  }, {
    a: '2e2',
    b: '200',
    expected: 0
  }, {
    a: '2e2',
    b: '201',
    expected: -1
  }, {
    a: '1e2',
    b: '1e3',
    expected: -1
  }, {
    a: '1e2',
    b: '1e-3',
    expected: 1
  }, {
    a: '1e-3',
    b: '1e2',
    expected: -1
  }, {
    a: '1e2',
    b: '1e2',
    expected: 0
  }, {
    a: '1e3',
    b: '1e2',
    expected: 1
  }, {
    a: '2.30',
    b: '2.3',
    expected: 0
  }, {
    a: '2.31',
    b: '2.3',
    expected: 1
  }, {
    a: '2.299',
    b: '2.3',
    expected: -1
  }, {
    a: '2000000000000000000000001',
    b: '2000000000000000000000000',
    expected: 1
  }, {
    a: '2000000000000000000000000',
    b: '2000000000000000000000000',
    expected: 0
  }, {
    a: '2000000000000000000000000',
    b: '2000000000000000000000001',
    expected: -1
  }, {
    a: '2000000000000000000000000',
    b: '200000000000000000000000',
    expected: 1
  }, {
    a: '2000000000000000000000000',
    b: '1999999999999999999999999',
    expected: 1
  }])('compareNumber($a, $b) -> $expected', _ref2 => {
    let {
      a,
      b,
      expected
    } = _ref2;
    expect(compareNumber(a, b)).toEqual(expected);
  });
  test('should sort numbers using compareNumber', () => {
    const values = ['4', '2.3', '-2.3', '0.025e2', '-1', '0'];
    expect(values.slice().sort(compareNumber)).toEqual(['-2.3', '-1', '0', '2.3', '0.025e2', '4']);
  });
});
test('countSignificantDigits', () => {
  expect(countSignificantDigits('2.345')).toEqual(4);
  expect(countSignificantDigits('2300')).toEqual(2);
  expect(countSignificantDigits('2.03')).toEqual(3);
  expect(countSignificantDigits('2.0300')).toEqual(3);
  expect(countSignificantDigits('0.0325900')).toEqual(4);
  expect(countSignificantDigits('0.0325900000000000000000000001')).toEqual(27);
  expect(countSignificantDigits('3259000.00000000000000000001')).toEqual(27);
  expect(countSignificantDigits('0200')).toEqual(1);
  expect(countSignificantDigits('0')).toEqual(0);
  expect(countSignificantDigits('000')).toEqual(0);
  expect(countSignificantDigits('0.0')).toEqual(0);
  expect(countSignificantDigits('1')).toEqual(1);
  expect(countSignificantDigits('23e3')).toEqual(2);
  expect(countSignificantDigits('-23')).toEqual(2);
  expect(countSignificantDigits('-0.23')).toEqual(2);
  expect(countSignificantDigits('230e-3')).toEqual(2);
  expect(countSignificantDigits('230E-3')).toEqual(2);
  expect(countSignificantDigits('.2')).toEqual(1);
  expect(countSignificantDigits('.002')).toEqual(1);
  expect(countSignificantDigits('20.00')).toEqual(1);
  expect(countSignificantDigits('2030.00')).toEqual(3);
});
test('extractSignificantDigits', () => {
  expect(extractSignificantDigits('2.345')).toEqual('2345');
  expect(extractSignificantDigits('23e4')).toEqual('23');
  expect(extractSignificantDigits('230000')).toEqual('23');
  expect(extractSignificantDigits('-77')).toEqual('77');
  expect(extractSignificantDigits('0.003400')).toEqual('34');
  expect(extractSignificantDigits('120.5e+30')).toEqual('1205');
  expect(extractSignificantDigits('120.5e-30')).toEqual('1205');
  expect(extractSignificantDigits('0120.50E-30')).toEqual('1205');
  expect(extractSignificantDigits('01200')).toEqual('12');
  expect(extractSignificantDigits('-01200')).toEqual('12');
});
//# sourceMappingURL=utils.test.js.map