import {nextTick} from './utils/nextTick';
import {waitForEvent} from './waitForEvent';

test('external abort', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const eventTarget = new AbortController().signal;
  eventTarget.removeEventListener = jest.fn(eventTarget.removeEventListener);

  let result: PromiseSettledResult<any> | undefined;

  waitForEvent(signal, eventTarget, 'test').then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(0);

  abortController.abort();

  await nextTick();

  expect(result).toMatchObject({
    status: 'rejected',
    reason: {name: 'AbortError'},
  });
  expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(1);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('fulfill', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const eventTargetController = new AbortController();
  const eventTarget = eventTargetController.signal;
  eventTarget.removeEventListener = jest.fn(eventTarget.removeEventListener);

  let result: PromiseSettledResult<any> | undefined;

  waitForEvent(signal, eventTarget, 'abort').then(
    value => {
      result = {status: 'fulfilled', value};
    },
    reason => {
      result = {status: 'rejected', reason};
    },
  );

  eventTargetController.abort();

  await nextTick();

  expect(result).toMatchObject({
    status: 'fulfilled',
    value: {type: 'abort'},
  });
  expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(1);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});
