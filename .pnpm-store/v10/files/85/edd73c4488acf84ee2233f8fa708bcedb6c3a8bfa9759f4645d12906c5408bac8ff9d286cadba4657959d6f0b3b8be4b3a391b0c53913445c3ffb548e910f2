import { expect, test } from 'vitest';
import { UnsafeNumberReason, extractSignificantDigits, getUnsafeNumberReason, isInteger, isNumber, isSafeNumber, toSafeNumberOrThrow } from './utils';
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
  expect(isSafeNumber('2.3')).toEqual(true);
  expect(isSafeNumber('2.3e4')).toEqual(true);
  expect(isSafeNumber('1234567890')).toEqual(true);
  expect(isSafeNumber('2e500')).toEqual(false);
  expect(isSafeNumber('2e-500')).toEqual(false);
  expect(isSafeNumber('0.66666666666666666667')).toEqual(false);
  expect(isSafeNumber('12345678901234567890')).toEqual(false);
  expect(isSafeNumber('1.2345678901234567890')).toEqual(false);

  // the following number loses formatting, but the value stays the same and hence is safe
  expect(isSafeNumber('2.300')).toEqual(true);
});
test('isSafeNumber({ approx: false })', () => {
  expect(isSafeNumber('0.66666666666666666667', {
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