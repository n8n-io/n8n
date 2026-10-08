import { classifyChatModelFailure } from '@n8n/ai-utilities/model-discovery';

/**
 * A 404 / not-found shape that could be the model but could equally be one of
 * the agent's tools. Deliberately not folded into
 * {@link classifyChatModelFailure}: that classifier is shared with workflow
 * verification, where a bare 404 is usually a node's own resource.
 */
const UNATTRIBUTED_NOT_FOUND = /\b404\b|\bnot found\b/i;

const DO_NOT_BLAME_THE_KEY =
	'Do not ask the user to check, revoke, or regenerate their API key. ' +
	'Call resolve_llm again for this provider to get a model the credential can ' +
	'actually reach, write it to the config, and retry.';

export interface CallAgentFailure {
	code: string;
	message: string;
}

/**
 * Turns a failed test run into a coded result for the builder agent.
 *
 * A provider rejecting the model id reads like a broken credential, and the
 * agent acted on that — users were told to regenerate a working key several
 * times before the model was ever questioned. So say when the model is the
 * known cause, and when it is merely the first thing worth ruling out.
 */
export function describeCallAgentFailure(message: string): CallAgentFailure {
	if (classifyChatModelFailure(message) === 'invalid_model') {
		return {
			code: 'invalid_model',
			message:
				`The model provider rejected the configured model: ${message} ` +
				`This is the model id, not the credential. ${DO_NOT_BLAME_THE_KEY}`,
		};
	}

	if (UNATTRIBUTED_NOT_FOUND.test(message)) {
		return {
			code: 'execution_failed',
			message:
				`${message} If this came from the model provider rather than one of the ` +
				"agent's tools, the configured model is the likely cause — a provider " +
				'returns 404 for a model it does not serve. Re-check the model id with ' +
				'resolve_llm before suggesting anything about the credential or API key.',
		};
	}

	return { code: 'execution_failed', message };
}
