import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function pollUntilAvailable<TResponse>(
	ctx: IExecuteFunctions,
	request: () => Promise<TResponse>,
	check: (response: TResponse) => boolean,
	timeoutSeconds: number,
	intervalSeconds = 5,
): Promise<TResponse> {
	const abortSignal = ctx.getExecutionCancelSignal();
	let response: TResponse | undefined;
	const startTime = Date.now();

	while (!response || !check(response)) {
		const elapsedTime = Date.now() - startTime;
		if (elapsedTime >= timeoutSeconds * 1000) {
			throw new NodeApiError(ctx.getNode(), {
				message: 'Timeout reached',
				code: 500,
			});
		}

		if (abortSignal?.aborted) {
			throw new NodeApiError(ctx.getNode(), {
				message: 'Execution was cancelled',
				code: 500,
			});
		}

		response = await request();

		// Wait before the next polling attempt
		await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
	}

	return response;
}
