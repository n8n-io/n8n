// Routing experiment only: hide the product name from the orchestrator model.
// It tests if the model's prior knowledge of n8n (agent = AI Agent node in a workflow) causes the workflow lean.
// shortcut: identifiers keep "n8n" (the n8n-docs tool, n8n-nodes-base ids, tool results), so the model can still infer it.

export const BRAND_NAME = 'Zentrova';

// Prose "n8n" only: keeps @n8n/ packages, n8n-nodes-base ids and N8N_ names intact.
const PRODUCT_NAME = /(?<![@\w./-])n8n(?![\w/-])/gi;

export function renameBrand(text: string): string {
	return text
		.replace(/\b([Aa])n (?=n8n(?![\w/-]))/g, '$1 ')
		.replace(/\bnon-n8n\b/g, `non-${BRAND_NAME}`)
		.replace(/\bn8n-specific\b/g, `${BRAND_NAME}-specific`)
		.replace(/\bdocs\.n8n\.io\b/g, `docs.${BRAND_NAME.toLowerCase()}.io`)
		.replace(PRODUCT_NAME, BRAND_NAME);
}

function renameDescriptions(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(renameDescriptions);
	if (typeof value !== 'object' || value === null) return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, inner]) => [
			key,
			key === 'description' && typeof inner === 'string'
				? renameBrand(inner)
				: renameDescriptions(inner),
		]),
	);
}

type Block = { type?: unknown; text?: unknown };
type Message = { content?: unknown };
type Tool = { name?: unknown; description?: unknown; input_schema?: unknown };
type RequestBody = { system?: unknown; tools?: Tool[]; messages?: Message[] };

function renameBlocks(content: unknown): unknown {
	if (typeof content === 'string') return renameBrand(content);
	if (!Array.isArray(content)) return content;
	return content.map((block: Block) =>
		block.type === 'text' && typeof block.text === 'string'
			? { ...block, text: renameBrand(block.text) }
			: block,
	);
}

export function renameRequestBody(body: RequestBody): RequestBody {
	// Only the orchestrator: the judge and the user proxy keep the real name.
	const isOrchestrator = body.tools?.some(
		(tool) => typeof tool.name === 'string' && tool.name.endsWith('select_agent'),
	);
	if (!isOrchestrator) return body;
	return {
		...body,
		system: renameBlocks(body.system),
		tools: body.tools?.map((tool) => ({
			...tool,
			description:
				typeof tool.description === 'string' ? renameBrand(tool.description) : tool.description,
			input_schema: renameDescriptions(tool.input_schema),
		})),
		messages: body.messages?.map((message) => ({
			...message,
			content: renameBlocks(message.content),
		})),
	};
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	if (!url.includes('/v1/messages') || typeof init?.body !== 'string') {
		return await originalFetch(input, init);
	}
	const body = JSON.stringify(renameRequestBody(JSON.parse(init.body) as RequestBody));
	return await originalFetch(input, { ...init, body });
};
