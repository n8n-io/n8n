import {spawn} from './spawn';
import {forever} from './forever';
import {delay} from './delay';

test('fork manual abort', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const actions: string[] = [];

  await spawn(signal, async (signal, {fork}) => {
    const task = fork(async signal => {
      actions.push('fork start');
      try {
        await forever(signal);
      } catch (err: any) {
        actions.push(`fork abort: ${err.message}`);
      }
    });

    actions.push('post fork');
    await delay(signal, 0);
    actions.push('pre task abort');
    task.abort();
    await delay(signal, 0);
    actions.push('post task abort');
  });

  expect(actions).toMatchInlineSnapshot(`
    Array [
      "fork start",
      "post fork",
      "pre task abort",
      "fork abort: The operation has been aborted",
      "post task abort",
    ]
  `);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('fork abort on spawn finish', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const actions: string[] = [];

  await spawn(signal, async (signal, {fork}) => {
    fork(async signal => {
      actions.push('fork start');
      try {
        await forever(signal);
      } catch (err: any) {
        actions.push(`fork abort: ${err.message}`);
      }
    });

    actions.push('post fork');
    await delay(signal, 0);
    actions.push('spawn finish');
  });

  expect(actions).toMatchInlineSnapshot(`
    Array [
      "fork start",
      "post fork",
      "spawn finish",
      "fork abort: The operation has been aborted",
    ]
  `);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('fork abort on spawn error', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const actions: string[] = [];

  await spawn(signal, async (signal, {fork}) => {
    fork(async signal => {
      actions.push('fork start');
      try {
        await forever(signal);
      } catch (err: any) {
        actions.push(`fork abort: ${err.message}`);
      }
    });

    actions.push('post fork');
    await delay(signal, 0);
    actions.push('spawn finish');
    throw new Error('the-error');
  }).catch(err => {
    actions.push(`spawn throw: ${err.message}`);
  });

  expect(actions).toMatchInlineSnapshot(`
    Array [
      "fork start",
      "post fork",
      "spawn finish",
      "fork abort: The operation has been aborted",
      "spawn throw: the-error",
    ]
  `);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('error thrown from fork', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);

  const actions: string[] = [];

  await spawn(signal, async (signal, {fork}) => {
    fork(async signal => {
      actions.push('fork start');
      await delay(signal, 0);
      actions.push('fork finish');
      throw new Error('the-error');
    });

    actions.push('post fork');

    try {
      await forever(signal);
    } catch (err: any) {
      actions.push(`spawn abort: ${err.message}`);
      throw err;
    }
  }).catch(err => {
    actions.push(`spawn throw: ${err.message}`);
  });

  expect(actions).toMatchInlineSnapshot(`
    Array [
      "fork start",
      "post fork",
      "fork finish",
      "spawn abort: The operation has been aborted",
      "spawn throw: the-error",
    ]
  `);

  expect(signal.addEventListener).toHaveBeenCalledTimes(1);
  expect(signal.removeEventListener).toHaveBeenCalledTimes(1);
});

test('async defer', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;

  const deferredFn = jest.fn();

  await spawn(signal, async (signal, {defer}) => {
    await delay(signal, 0);

    defer(() => {
      deferredFn();
    });
  });

  expect(deferredFn).toHaveBeenCalledTimes(1);
});

test('abort before spawn', async () => {
  const abortController = new AbortController();
  const signal = abortController.signal;
  signal.addEventListener = jest.fn(signal.addEventListener);
  signal.removeEventListener = jest.fn(signal.removeEventListener);
  abortController.abort();

  const executor = jest.fn(async (signal: AbortSignal) => {});

  await expect(spawn(signal, executor)).rejects.toMatchObject({
    name: 'AbortError',
  });

  expect(executor).not.toHaveBeenCalled();

  expect(signal.addEventListener).not.toHaveBeenCalled();
  expect(signal.removeEventListener).not.toHaveBeenCalled();
});
