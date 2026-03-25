import { expect, test } from 'vitest';
import { LosslessNumber, getUnsafeNumberReason, isInteger, isLosslessNumber, isNumber, isSafeNumber, parse, parseLosslessNumber, parseNumberAndBigInt, reviveDate, stringify, toLosslessNumber, toSafeNumberOrThrow } from './index';
test('Public API', () => {
  expect(parse('{}')).toEqual({});
  expect(stringify({})).toEqual('{}');
  expect(new LosslessNumber('2').isLosslessNumber).toBe(true);
  expect(typeof isLosslessNumber).toBe('function');
  expect(typeof toLosslessNumber).toBe('function');
  expect(typeof reviveDate).toBe('function');
  expect(typeof parseLosslessNumber).toBe('function');
  expect(typeof parseNumberAndBigInt).toBe('function');
  expect(typeof isInteger).toBe('function');
  expect(typeof isNumber).toBe('function');
  expect(typeof isSafeNumber).toBe('function');
  expect(typeof toSafeNumberOrThrow).toBe('function');
  expect(typeof getUnsafeNumberReason).toBe('function');
});
//# sourceMappingURL=index.test.js.map