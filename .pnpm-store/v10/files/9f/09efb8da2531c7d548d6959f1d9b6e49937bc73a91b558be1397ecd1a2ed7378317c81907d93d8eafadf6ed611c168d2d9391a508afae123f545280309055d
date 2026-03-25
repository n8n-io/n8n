import defer from 'defer-promise';
import {AbortError} from './AbortError';
import {all} from './all';
import {nextTick} from './utils/nextTick';

test('external abort', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const deferred1 = defer<string>();
  const deferred2 = defer<number>();

  let result: PromiseSettledResult<[string, number]> | undefined;
  let innerSignal: AbortSignal;

  all(signal, signal => {
    innerSignal = signal;
    return [deferred1.promise, deferred2.promise];
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  abortController.abort();

  expect(innerSignal!.aborted).toBe(true);

  await nextTick();

  expect(result).toBeUndefined();

  deferred1.reject(new AbortError());
  await nextTick();

  expect(result).toBeUndefined();

  deferred2.reject(new AbortError());
  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: {name: 'AbortError'},
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('fulfill', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const deferred1 = defer<string>();
  const deferred2 = defer<number>();

  let result: PromiseSettledResult<[string, number]> | undefined;
  let innerSignal: AbortSignal;

  all(signal, signal => {
    innerSignal = signal;
    return [deferred1.promise, deferred2.promise];
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  await nextTick();

  expect(result).toBeUndefined();

  // resolve `deferred2` first to test ordering
  deferred2.resolve(42);
  await nextTick();

  expect(result).toBeUndefined();

  deferred1.resolve('test');
  await nextTick();

  expect(innerSignal!.aborted).toBe(false);
  expect(result).toMatchObject({
    status: 'fulfilled',
    value: ['test', 42],
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('reject', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const deferred1 = defer<string>();
  const deferred2 = defer<number>();

  let result: PromiseSettledResult<[string, number]> | undefined;
  let innerSignal: AbortSignal;

  all(signal, signal => {
    innerSignal = signal;
    return [deferred1.promise, deferred2.promise];
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  await nextTick();

  expect(result).toBeUndefined();
  expect(innerSignal!.aborted).toBe(false);

  deferred1.reject('test');
  await nextTick();

  expect(result).toBeUndefined();
  expect(innerSignal!.aborted).toBe(true);

  deferred2.reject(new AbortError());
  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: 'test',
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('reject during cleanup', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const deferred1 = defer<string>();
  const deferred2 = defer<number>();

  let result: PromiseSettledResult<[string, number]> | undefined;
  let innerSignal: AbortSignal;

  all(signal, signal => {
    innerSignal = signal;
    return [deferred1.promise, deferred2.promise];
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  abortController.abort();

  expect(innerSignal!.aborted).toBe(true);

  await nextTick();

  expect(result).toBeUndefined();

  deferred1.reject(new AbortError());
  await nextTick();

  expect(result).toBeUndefined();

  deferred2.reject(new Error('test'));
  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: {message: 'test'},
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('empty', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  await expect(all(signal, signal => [])).resolves.toEqual([]);

  expect(signal.addEventListener).toHaveBeenCalledTimes(0);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(0);
});
