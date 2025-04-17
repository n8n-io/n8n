import type { FailedAttemptHandler } from '@langchain/core/dist/utils/async_caller';
import type { ISupplyDataFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { n8nDefaultFailedAttemptHandler } from './n8nDefaultFailedAttemptHandler';

/**
 * This function returns a custom failed attempt handler for using with LangChain models.
 * It first tries to use a custom handler passed as an argument, and if that doesn't throw an error, it uses the default handler.
 * It always wraps the error in a NodeApiError.
 * It throws an error ONLY if there are no retries left.
 */
export const makeN8nLlmFailedAttemptHandler = (
	ctx: ISupplyDataFunctions,
	handler?: FailedAttemptHandler,
): FailedAttemptHandler => {
	return (error: any) => {
		try {
			// Try custom error handler first
			handler?.(error);

			// If it didn't throw an error, use the default handler
			n8nDefaultFailedAttemptHandler(error);
		} catch (e) {
			// Wrap the error in a NodeApiError
			const apiError = new NodeApiError(ctx.getNode(), e as unknown as JsonObject, {
				functionality: 'configuration-node',
			});

			throw apiError;
		}

		// If no error was thrown, check if it is the last retry
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (error?.retriesLeft > 0) {
			return;
		}

		// If there are no retries left, throw the error wrapped in a NodeApiError
		const apiError = new NodeApiError(ctx.getNode(), error as unknown as JsonObject, {
			functionality: 'configuration-node',
		});

		throw apiError;
	};
};
