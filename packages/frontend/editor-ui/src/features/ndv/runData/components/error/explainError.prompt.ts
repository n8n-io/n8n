import { z } from 'zod';
import type { NodeError, NodeApiError, NodeOperationError } from 'n8n-workflow';

export type ExplainErrorResult =
	| { kind: 'structured'; summary: string; culprit: string; nextStep: string }
	| { kind: 'raw'; text: string };

const structuredSchema = z.object({
	summary: z.string().min(1),
	culprit: z.string().min(1),
	nextStep: z.string().min(1),
});

/**
 * Builds a deterministic prompt asking the assistant to produce a strict
 * JSON object describing what likely went wrong, the likely culprit, and a
 * concrete next step. Determinism matters for the in-memory de-dup cache.
 */
export function buildExplainErrorQuestion(
	error: NodeError | NodeApiError | NodeOperationError,
): string {
	const node = error.node;
	const nodeName = node?.name ?? 'unknown node';
	const nodeType = node?.type ?? 'unknown type';
	const message = error.message ?? '';
	const description = error.description ?? '';

	return [
		'A node in an n8n workflow failed. Explain the error to a non-technical builder.',
		'',
		`Node: ${nodeName}`,
		`Node type: ${nodeType}`,
		`Error message: ${message}`,
		description ? `Error description: ${description}` : '',
		'',
		'Respond ONLY with a single fenced JSON code block matching this shape:',
		'```json',
		'{',
		'  "summary": "<one or two short sentences in plain English>",',
		'  "culprit": "<the parameter or credential most likely at fault>",',
		'  "nextStep": "<one concrete next step the user can try>"',
		'}',
		'```',
		'Keep each field under 200 characters. Do not include any text outside the code block.',
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Extracts the JSON object from the assistant's response. We tolerate the
 * model returning fenced or unfenced JSON; if neither parses, we fall back
 * to rendering the raw text in a single "summary" section.
 */
export function parseExplainErrorResponse(raw: string): ExplainErrorResult {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced?.[1]?.trim() ?? extractFirstJsonObject(raw);

	if (candidate !== undefined) {
		try {
			const json: unknown = JSON.parse(candidate);
			const parsed = structuredSchema.safeParse(json);
			if (parsed.success) {
				return {
					kind: 'structured',
					summary: parsed.data.summary,
					culprit: parsed.data.culprit,
					nextStep: parsed.data.nextStep,
				};
			}
		} catch {
			// fall through to raw
		}
	}

	return { kind: 'raw', text: raw.trim() };
}

function extractFirstJsonObject(text: string): string | undefined {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) return undefined;
	return text.slice(start, end + 1);
}
