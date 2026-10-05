import { classifyChatModelFailure } from '@n8n/ai-utilities/model-discovery';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

function statusOf(error: unknown): number | undefined {
	if (!isRecord(error)) return undefined;
	if (typeof error.status === 'number') return error.status;
	const response = error.response;
	return isRecord(response) && typeof response.status === 'number' ? response.status : undefined;
}

function messageOf(error: unknown): string | undefined {
	return isRecord(error) && typeof error.message === 'string' ? error.message : undefined;
}

// Azure answers a Responses-only deployment on Chat Completions with a bare "Model not
// supported", which the shared classifier does not cover. Matched narrowly here rather than by
// widening a pattern the workflow and agents builders also depend on. The gap is bounded and
// stops at a sentence end so "does not support temperature ... with this model." cannot match.
const MODEL_NOT_SUPPORTED = /\bmodels?\b[^.]{0,30}\bnot supported\b/i;

// What Azure actually returns when a deployment does not serve the route the node asked for.
// It names neither the model nor the API, so nothing else can recognise it.
const OPERATION_UNSUPPORTED = /\brequested operation is unsupported\b/i;

/**
 * Whether Azure rejected the deployment itself rather than something in the request.
 *
 * A 404 means the route or the deployment is not there. A 400 is ambiguous, so the shared
 * classifier decides first: an unsupported parameter keeps its own message, because "does not
 * support temperature" and "max_tokens is not supported" are the most common Azure 400s and
 * neither has anything to do with the API mode.
 */
function isDeploymentRejected(error: unknown): boolean {
	const message = messageOf(error);
	const kind = classifyChatModelFailure(message);
	if (kind === 'unsupported_parameter') return false;

	const status = statusOf(error);
	if (status === 404) return true;
	if (status !== 400) return false;

	return (
		kind === 'capability_mismatch' ||
		kind === 'invalid_model' ||
		MODEL_NOT_SUPPORTED.test(message ?? '') ||
		OPERATION_UNSUPPORTED.test(message ?? '')
	);
}

/**
 * A Foundry deployment serves the Responses API, Chat Completions or the Anthropic Messages API,
 * and Azure gives no way to ask which. Picking the wrong one fails in terms of the deployment,
 * which reads as a bad name, so name the deployment and the API the node asked for and point at
 * the setting that selects the route.
 *
 * `useResponsesApi` is what the node asked for, not a guarantee. LangChain can still choose the
 * Responses API on its own for some model names, so the message says which one was requested.
 */
export function makeAzureFoundryFailedAttemptHandler(
	modelName: string,
	useResponsesApi: boolean,
	route: 'foundry' | 'classic' | 'anthropic' = 'foundry',
): (error: unknown) => void {
	const apiRequested =
		route === 'anthropic'
			? 'the Anthropic Messages API'
			: useResponsesApi
				? 'the Responses API'
				: 'Chat Completions';
	// A classic credential cannot reach the Responses API at all, so telling someone to turn the
	// toggle on would send them to an error. The move there is to change the credential.
	const remedy =
		route === 'anthropic'
			? 'Set Model Family to OpenAI if the deployment is not a Claude model.'
			: route === 'classic'
				? 'Switch the credential to the Azure AI Foundry endpoint type if the deployment serves only the Responses API.'
				: useResponsesApi
					? "Turn off 'Use Responses API' if the deployment serves Chat Completions."
					: "Turn on 'Use Responses API' if the deployment serves only the Responses API.";

	return (error: unknown) => {
		if (!isDeploymentRejected(error)) return;

		throw new UserError(
			`Azure did not accept the deployment "${modelName}" on ${apiRequested}. Check the deployment name. ${remedy}`,
			{ cause: error },
		);
	};
}
