import {
  AbortError,
  catchAbortError,
  isAbortError,
  rethrowAbortError,
  throwIfAborted,
} from './AbortError';

test('isAbortError', () => {
  expect(isAbortError({})).toBe(false);
  expect(isAbortError(undefined)).toBe(false);
  expect(isAbortError(null)).toBe(false);

  expect(isAbortError(new AbortError())).toBe(true);
});

test('throwIfAborted', () => {
  const abortController = new AbortController();

  expect(() => throwIfAborted(abortController.signal)).not.toThrow();

  abortController.abort();

  expect(() => throwIfAborted(abortController.signal)).toThrow(AbortError);
});

test('rethrowAbortError', () => {
  expect(() => rethrowAbortError(new AbortError())).toThrow(AbortError);
  expect(() => rethrowAbortError(new Error())).not.toThrow();
});

test('catchAbortError', () => {
  expect(() => catchAbortError(new AbortError())).not.toThrow();
  expect(() => catchAbortError(new Error())).toThrow();
});
