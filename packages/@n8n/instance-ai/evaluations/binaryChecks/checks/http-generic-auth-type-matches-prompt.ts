import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';

const HTTP_REQUEST_TYPE = 'n8n-nodes-base.httpRequest';

const BEARER_PROMPT_PATTERNS = [
	/\bbearer\s+(?:token|auth(?:entication)?)\b/i,
	/\bauthorization\s*:\s*bearer\b/i,
	/\b(?:use|with|via|using)\s+(?:a\s+|my\s+)?bearer\b/i,
];

const CUSTOM_HEADER_NAME_PATTERNS = [
	/\bx-[a-z][a-z0-9-]*\b/i,
	/\bheader\s+(?:named|called)\s+["'`]?[a-z][\w-]*["'`]?/i,
	/\bcustom\s+header\b/i,
	/\bheader\s+name\b/i,
	/\bapikey\s+header\b/i,
];

function isHttpRequestWithGenericAuth(node: WorkflowNodeResponse): boolean {
	return (
		node.type === HTTP_REQUEST_TYPE && node.parameters?.authentication === 'genericCredentialType'
	);
}

function getGenericAuthType(node: WorkflowNodeResponse): string {
	const value = node.parameters?.genericAuthType;
	return typeof value === 'string' ? value : '';
}

function promptAsksForBearer(prompt: string): boolean {
	return BEARER_PROMPT_PATTERNS.some((p) => p.test(prompt));
}

function promptSpecifiesCustomHeaderName(prompt: string): boolean {
	return CUSTOM_HEADER_NAME_PATTERNS.some((p) => p.test(prompt));
}

export const httpGenericAuthTypeMatchesPrompt: BinaryCheck = {
	name: 'http_generic_auth_type_matches_prompt',
	description:
		'HTTP Request nodes pick a genericAuthType consistent with the prompt — prefer httpBearerAuth for Authorization: Bearer flows; reserve httpHeaderAuth for custom header names',
	kind: 'deterministic',
	run(workflow, ctx) {
		const issues: string[] = [];

		for (const node of workflow.nodes ?? []) {
			if (!isHttpRequestWithGenericAuth(node)) continue;

			const genericAuthType = getGenericAuthType(node);
			if (genericAuthType !== 'httpHeaderAuth') continue;

			const bearerIntent = promptAsksForBearer(ctx.prompt);
			const customHeaderIntent = promptSpecifiesCustomHeaderName(ctx.prompt);

			if (bearerIntent && !customHeaderIntent) {
				issues.push(
					`"${node.name}" uses httpHeaderAuth but the prompt asks for Bearer auth — should be httpBearerAuth`,
				);
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
