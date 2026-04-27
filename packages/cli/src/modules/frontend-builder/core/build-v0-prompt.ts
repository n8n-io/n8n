type Endpoint = {
	nodeName: string;
	method: string;
	url: string;
	requestExample?: unknown;
	responseExample?: unknown;
};

export type BuildV0PromptInput = {
	userPrompt: string;
	endpoints: Endpoint[];
};

/**
 * Compose the message we send to v0 from the user's free-form prompt and the
 * workflow's webhook trigger metadata. v0 generates the FE; this is its only
 * source of truth for the API contract.
 *
 * Pure function. Examples should already have been passed through
 * `sanitizeEndpointExamples` before reaching here.
 */
export function buildV0Prompt({ userPrompt, endpoints }: BuildV0PromptInput): string {
	const endpointBlocks = endpoints.map((ep) => {
		const lines = [`- ${ep.method} ${ep.url}  (node: "${ep.nodeName}")`];
		if (ep.requestExample !== undefined) {
			lines.push(`  Example request body: ${JSON.stringify(ep.requestExample)}`);
		}
		if (ep.responseExample !== undefined) {
			lines.push(`  Example response: ${JSON.stringify(ep.responseExample)}`);
		}
		return lines.join('\n');
	});

	return [
		'You are building a single-page frontend that talks to these n8n workflow endpoints:',
		'',
		...endpointBlocks,
		'',
		`User request: ${userPrompt}`,
		'',
		'Constraints:',
		'- Use fetch() directly; no separate backend.',
		'- If a response example is missing, treat the shape as unknown and render received data as JSON for now.',
		'- Handle network errors gracefully.',
	].join('\n');
}
