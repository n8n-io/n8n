import { pause } from '@redocly/openapi-core';
import { DeploymentError } from '../utils';
import { exitWithError } from '../../utils/miscellaneous';

import type { ReuniteApiError } from '../api';

/**
 * This function retries an operation until a condition is met or a timeout is exceeded.
 * If the condition is not met within the timeout, an error is thrown.
 * @operation The operation to retry.
 * @condition The condition to check after each operation result. Return false to continue retrying. Return true to stop retrying.
 *            If not provided, the first result will be returned.
 * @param onConditionNotMet Will be called with the last result right after checking condition and before timeout and retrying.
 * @param onRetry Will be called right before retrying operation with the last result before retrying.
 * @param startTime The start time of the operation. Default is the current time.
 * @param retryTimeoutMs The maximum time to retry the operation. Default is 10 minutes.
 * @param retryIntervalMs The interval between retries. Default is 5 seconds.
 */
export async function retryUntilConditionMet<T>({
  operation,
  condition,
  onConditionNotMet,
  onRetry,
  startTime = Date.now(),
  retryTimeoutMs = 600000, // 10 min
  retryIntervalMs = 5000, // 5 sec
}: {
  operation: () => Promise<T>;
  condition?: ((result: T) => boolean) | null;
  onConditionNotMet?: (lastResult: T) => void;
  onRetry?: (lastResult: T) => void | Promise<void>;
  startTime?: number;
  retryTimeoutMs?: number;
  retryIntervalMs?: number;
}): Promise<T> {
  async function attempt(): Promise<T> {
    const result = await operation();

    if (!condition) {
      return result;
    }

    if (condition(result)) {
      return result;
    } else if (Date.now() - startTime > retryTimeoutMs) {
      throw new Error('Timeout exceeded.');
    } else {
      onConditionNotMet?.(result);
      await pause(retryIntervalMs);
      await onRetry?.(result);
      return attempt();
    }
  }

  return attempt();
}

export function handleReuniteError(
  message: string,
  error: ReuniteApiError | DeploymentError | Error
) {
  const errorMessage =
    error instanceof DeploymentError ? error.message : `${message} Reason: ${error.message}\n`;

  return exitWithError(errorMessage);
}
