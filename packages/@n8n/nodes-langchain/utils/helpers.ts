import { CallbackManager } from 'langchain/callbacks';
import type { IExecuteFunctions } from 'n8n-workflow';

export function getMetadataFiltersValues(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Record<string, never> | undefined {
	const metadata = ctx.getNodeParameter('options.metadata.metadataValues', itemIndex, []) as Array<{
		name: string;
		value: string;
	}>;
	if (metadata.length > 0) {
		return metadata.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
	}

	return undefined;
}

export function getWorkflowRunningAbortSignal(context: IExecuteFunctions, triggerCallback: string) {
	const abortController = new AbortController();
	const callbacks = CallbackManager.fromHandlers({
		[triggerCallback]: () => {
			console.log(triggerCallback, 'triggered');
			const isRunning = context.isRunning();

			if (!isRunning) {
				console.log('Is not running');
				abortController.abort();
			} else {
				console.log('Is running');
			}
		},
	});

	return {
		signal: abortController.signal,
		callbacks,
	};
}
