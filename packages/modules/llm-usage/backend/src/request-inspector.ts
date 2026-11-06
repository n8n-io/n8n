import {
	checkLlmCall,
	createUsageReader,
	credentialFromNode,
	parseProviderUsage,
	providerFromCredentials,
	reportLlmUsage,
	type LlmCallContext,
	type NodeCredentialSlots,
	type ParsedUsage,
} from '@n8n/ai-utilities/llm-usage';
import { UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';

/**
 * Most string bodies are not LLM calls. A cheap look avoids parsing them: parsing a large body
 * costs time and memory on every request of the node.
 */
const mayBeLlmJson = (body: string) =>
	body.trimStart().startsWith('{') && (body.includes('"model"') || body.includes('"contents"'));

function parseBody(body: unknown) {
	if (typeof body !== 'string') return body;
	if (!mayBeLlmJson(body)) return undefined;
	try {
		const parsed: unknown = JSON.parse(body);
		return parsed;
	} catch {
		return undefined;
	}
}

/** Decides from the request body alone, so any URL works: OpenAI, Anthropic, Gemini shapes. */
function isLlmRequest(body: unknown): body is Record<string, unknown> {
	if (!isRecord(body)) return false;
	if (Array.isArray(body.contents)) return true;
	return (
		typeof body.model === 'string' &&
		(Array.isArray(body.messages) ||
			body.input !== undefined ||
			// A completion prompt is a string, a list of strings, or a list of token IDs.
			(body.prompt !== undefined && body.prompt !== null))
	);
}

/** Returns an inspector for a node HTTP request that looks like an LLM call. */
export function inspectRequest(input: {
	context: LlmCallContext;
	credentialTypes: string[];
	credentials?: NodeCredentialSlots;
	credentialType?: string;
	requestBody: unknown;
}) {
	const body = parseBody(input.requestBody);
	if (!isLlmRequest(body)) return undefined;

	const startedAt = new Date();
	const requestedModel = typeof body.model === 'string' ? body.model : undefined;
	const credentialProvider = providerFromCredentials(input.credentialTypes);
	const credential = credentialFromNode(input.credentials, input.credentialType);
	let reader: ReturnType<typeof createUsageReader> | undefined;

	const report = (usage: ParsedUsage | undefined) => {
		if (!usage) return;
		const model = usage.model ?? requestedModel ?? 'unknown';
		// Many providers answer in the OpenAI format, so only for that format does the credential
		// name the provider better. An Anthropic or Gemini format names its own provider.
		const provider =
			usage.provider === 'openai' ? (credentialProvider ?? usage.provider) : usage.provider;
		reportLlmUsage(
			{ ...usage, provider, model, startedAt, finishedAt: new Date(), subType: 'http', credential },
			input.context,
		);
	};

	return {
		onResponse: (response: unknown) => report(parseProviderUsage(response)),
		onStreamChunk: (chunk: Buffer) => (reader ??= createUsageReader()).push(chunk),
		onStreamEnd: () => report(reader?.result()),
		check: async () => {
			try {
				await checkLlmCall({
					context: input.context,
					credential,
					provider: credentialProvider,
					model: requestedModel,
				});
			} catch (error) {
				// Nodes read an HTTP status from a request error, and a 403 reads as a credential problem.
				throw new UserError(error instanceof Error ? error.message : String(error));
			}
		},
	};
}
