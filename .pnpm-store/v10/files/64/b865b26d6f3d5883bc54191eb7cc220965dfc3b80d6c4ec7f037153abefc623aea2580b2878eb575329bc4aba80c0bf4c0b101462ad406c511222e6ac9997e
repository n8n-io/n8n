import { Status } from 'nice-grpc';
export const retryOptions = {
    retry: true,
    retryMaxAttempts: 5,
    retryableStatuses: [Status.UNAVAILABLE],
    onRetryableError(error, attempt, delayMs) {
        console.warn(error, `Attempt ${attempt} failed. Retrying in ${delayMs}ms.`);
    },
};
