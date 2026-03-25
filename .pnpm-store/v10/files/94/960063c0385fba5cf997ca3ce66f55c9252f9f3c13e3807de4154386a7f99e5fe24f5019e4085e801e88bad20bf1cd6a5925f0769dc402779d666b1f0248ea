import defer from 'defer-promise';
import {execute} from './execute';
import {nextTick} from './utils/nextTick';

test('resolve immediately', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const callback = jest.fn(() => {});

  await expect(
    execute<string>(signal, (resolve, reject) => {
      resolve('test');

      return callback;
    }),
  ).resolves.toEqual('test');

  expect(callback).not.toHaveBeenCalled();

  abortController.abort();

  await nextTick();

  expect(callback).not.toHaveBeenCalled();

  expect(signal.addEventListener).not.toHaveBeenCalled();
  expect(signal.removeEventListener).not.toHaveBeenCalled();
});

test('resolve before abort', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  let resolve: (value: string) => void;

  const callback = jest.fn(() => {});

  let result: PromiseSettledResult<string> | undefined;

  execute<string>(signal, (resolve_, reject) => {
    resolve = resolve_;

    return callback;
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  resolve!('test');

  abortController.abort();

  await nextTick();

  expect(callback).not.toHaveBeenCalled();
  expect(result).toEqual({status: 'fulfilled', value: 'test'});

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('abort before resolve', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  let resolve: (value: string) => void;

  const callback = jest.fn(() => {});

  let result: PromiseSettledResult<string> | undefined;

  execute<string>(signal, (resolve_, reject) => {
    resolve = resolve_;

    return callback;
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  abortController.abort();
  resolve!('test');

  await nextTick();

  expect(callback).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({
    status: 'rejected',
    reason: {name: 'AbortError'},
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('abort before execute', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);
  abortController.abort();

  const executor = jest.fn(
    (
      resolve: (value: string) => void,
      reject: (reason?: any) => void,
    ): (() => void | PromiseLike<void>) => {
      return () => {};
    },
  );

  await expect(execute(signal, executor)).rejects.toMatchObject({
    name: 'AbortError',
  });

  expect(executor).not.toHaveBeenCalled();

  expect(signal.addEventListener).not.toHaveBeenCalled();
  expect(signal.removeEventListener).not.toHaveBeenCalled();
});

test('reject immediately', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const callback = jest.fn(() => {});

  await expect(
    execute<string>(signal, (resolve, reject) => {
      reject('test');

      return callback;
    }),
  ).rejects.toEqual('test');

  expect(callback).not.toHaveBeenCalled();

  abortController.abort();

  await nextTick();

  expect(callback).not.toHaveBeenCalled();

  expect(signal.addEventListener).not.toHaveBeenCalled();
  expect(signal.removeEventListener).not.toHaveBeenCalled();
});

test('reject before abort', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  let reject: (value: string) => void;

  const callback = jest.fn(() => {});

  let result: PromiseSettledResult<string> | undefined;

  execute<string>(signal, (resolve, reject_) => {
    reject = reject_;

    return callback;
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  reject!('test');

  abortController.abort();

  await nextTick();

  expect(callback).not.toHaveBeenCalled();
  expect(result).toEqual({status: 'rejected', reason: 'test'});

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('abort before reject', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  let reject: (value: string) => void;

  const callback = jest.fn(() => {});

  let result: PromiseSettledResult<string> | undefined;

  execute<string>(signal, (resolve, reject_) => {
    reject = reject_;

    return callback;
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  abortController.abort();
  reject!('test');

  await nextTick();

  expect(callback).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({
    status: 'rejected',
    reason: {name: 'AbortError'},
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('async abort callback', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const callbackDeferred = defer<void>();

  const callback = jest.fn(() => callbackDeferred.promise);

  let result: PromiseSettledResult<string> | undefined;

  execute<string>(signal, (resolve, reject) => {
    return callback;
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  abortController.abort();

  await nextTick();

  expect(result).toBeUndefined();

  callbackDeferred.resolve();

  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: {name: 'AbortError'},
  });
  expect(callback).toHaveBeenCalledTimes(1);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('async abort callback rejection', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const callback = jest.fn(() => Promise.reject('test'));

  let result: PromiseSettledResult<string> | undefined;

  execute<string>(signal, (resolve, reject) => {
    return callback;
  }).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  abortController.abort();

  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: 'test',
  });
  expect(callback).toHaveBeenCalledTimes(1);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});
