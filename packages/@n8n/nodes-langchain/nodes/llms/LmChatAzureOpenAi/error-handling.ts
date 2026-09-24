import { OperationalError } from 'n8n-workflow';

function statusOf(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
	return typeof error.status === 'number' ? error.status : undefined;
}

function messageOf(error: unknown): string {
	if (typeof error !== 'object' || error === null || !('message' in error)) return '';
	return typeof error.message === 'string' ? error.message : '';
}

/**
 * Azure rejects a deployment it cannot serve on the chosen route in two ways: a 404 when the route
 * does not exist, and a 400 naming the model when it does. Other 400s are ordinary request errors,
 * so the message has to match as well.
 */
function isRouteMismatch(error: unknown): boolean {
	const status = statusOf(error);
	if (status === 404) return true;
	if (status !== 400) return false;

	return (
		/\bmodels?\b/i.test(messageOf(error)) && /not supported|unsupported/i.test(messageOf(error))
	);
}

/**
 * A Foundry deployment serves the Responses API or Chat Completions, and Azure gives no way to ask
 * which. Picking the wrong one fails in terms of the model, which reads as a bad deployment name,
 * so name the deployment and the API in use and point at the setting.
 */
export function makeAzureFoundryFailedAttemptHandler(
	modelName: string,
	useResponsesApi: boolean,
): (error: unknown) => void {
	const apiInUse = useResponsesApi ? 'the Responses API' : 'Chat Completions';
	const remedy = useResponsesApi
		? "Turn off 'Use Responses API' if the deployment serves Chat Completions."
		: "Turn on 'Use Responses API' if the deployment serves only the Responses API.";

	return (error: unknown) => {
		if (!isRouteMismatch(error)) return;

		throw new OperationalError(
			`Azure did not accept the deployment "${modelName}" on ${apiInUse}. Check the deployment name. ${remedy}`,
			{ cause: error },
		);
	};
}
