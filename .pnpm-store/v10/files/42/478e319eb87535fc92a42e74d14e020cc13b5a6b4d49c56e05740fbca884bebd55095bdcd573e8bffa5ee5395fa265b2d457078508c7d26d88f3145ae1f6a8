import { retryUntilConditionMet } from '../utils';

jest.mock('@redocly/openapi-core', () => ({
  pause: jest.requireActual('@redocly/openapi-core').pause,
}));

describe('retryUntilConditionMet()', () => {
  it('should retry until condition meet and return result', async () => {
    const operation = jest
      .fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'done' });

    const data = await retryUntilConditionMet({
      operation,
      condition: (result: any) => result?.status === 'done',
      retryIntervalMs: 100,
      retryTimeoutMs: 1000,
    });

    expect(data).toEqual({ status: 'done' });
  });

  it('should throw error if condition not meet for desired timeout', async () => {
    const operation = jest.fn().mockResolvedValue({ status: 'pending' });

    await expect(
      retryUntilConditionMet({
        operation,
        condition: (result: any) => result?.status === 'done',
        retryIntervalMs: 100,
        retryTimeoutMs: 1000,
      })
    ).rejects.toThrow('Timeout exceeded.');
  });

  it('should call "onConditionNotMet" and "onRetry" callbacks', async () => {
    const operation = jest
      .fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'done' });

    const onConditionNotMet = jest.fn();
    const onRetry = jest.fn();

    const data = await retryUntilConditionMet({
      operation,
      condition: (result: any) => result?.status === 'done',
      retryIntervalMs: 100,
      retryTimeoutMs: 1000,
      onConditionNotMet,
      onRetry,
    });

    expect(data).toEqual({ status: 'done' });

    expect(onConditionNotMet).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
