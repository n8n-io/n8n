import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

const PRINTABLE_ASCII = /^[ -~]*$/;

/** A header carries latin-1, so a Cyrillic or emoji workflow name travels percent-encoded. */
function headerSafe(value: string): string {
	return PRINTABLE_ASCII.test(value) ? value : encodeURIComponent(value);
}

/**
 * What a gateway needs to attribute usage and cost back to a workflow. The
 * project ID is absent because a node cannot read its own project; a user who
 * needs it adds a gateway header on the credential.
 */
export function n8nContextHeaders(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
): Record<string, string> {
	const workflow = ctx.getWorkflow();
	const candidates: Array<[string, string | number | undefined]> = [
		['x-n8n-workflow-id', workflow.id],
		['x-n8n-workflow-name', workflow.name],
		['x-n8n-execution-id', ctx.getExecutionId()],
	];

	return Object.fromEntries(
		candidates.flatMap(([name, value]) => {
			const text = value === undefined ? '' : String(value);
			return text ? [[name, headerSafe(text)]] : [];
		}),
	);
}
