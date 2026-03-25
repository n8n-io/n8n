import {abortable} from './abortable';
import {nextTick} from './utils/nextTick';

test('abortable endless promise', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  let result: PromiseSettledResult<void> | undefined;

  abortable(
    signal,
    new Promise<void>(() => {}),
  ).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  await nextTick();

  expect(result).toBeUndefined();

  abortController.abort();

  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: {name: 'AbortError'},
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('abort before reject', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  abortController.abort();

  let result: PromiseSettledResult<void> | undefined;

  abortable(
    signal,
    new Promise<void>((resolve, reject) => {
      reject('test');
    }),
  ).then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: {name: 'AbortError'},
  });

  expect(signal.addEventListener).toHaveBeenCalledTimes(0);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(0);
});
