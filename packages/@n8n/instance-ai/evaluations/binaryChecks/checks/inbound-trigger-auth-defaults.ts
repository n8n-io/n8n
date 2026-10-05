import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';
import { WEBPAGE_TYPE } from '../utils';

const INBOUND_TRIGGER_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
	WEBPAGE_TYPE,
]);

const EXPLICIT_INBOUND_AUTH_PATTERNS = [
	/\bauthenticated\s+(?:webhook|form|chat|mcp)\b/i,
	/\b(?:webhook|form|chat|mcp|inbound|incoming)\b.{0,80}\b(?:auth|authenticated|authentication|authorization|bearer|jwt|basic auth|header auth|api key|token|password)\b/i,
	/\b(?:require|requires|requiring|protect|secure|authenticate)\b.{0,80}\b(?:webhook|form|chat|mcp|inbound|incoming)\b/i,
	/\b(?:webhook|form|chat|mcp|inbound|incoming)\b.{0,80}\b(?:require|protect|secure|authenticate)\b/i,
];

// "Page", "site" and "login" are common words in prompts that ask for no inbound
// auth, so these patterns apply only to Webpage nodes.
const EXPLICIT_PAGE_AUTH_PATTERNS = [
	/\bauthenticated\s+(?:page|site|website)\b/i,
	/\b(?:page|site|website)\b.{0,80}\b(?:auth|authenticated|authentication|authorization|bearer|jwt|basic auth|header auth|api key|token|password)\b/i,
	/\b(?:require|requires|requiring|protect|secure|authenticate)\b.{0,80}\b(?:page|site|website)\b/i,
	/\b(?:page|site|website)\b.{0,80}\b(?:require|protect|secure|authenticate)\b/i,
	// "Only signed-in users can open the page" asks for the n8n user auth of a Webpage node.
	/\b(?:signed|logged)[- ]in\b.{0,40}\b(?:users?|members?|accounts?)\b/i,
	/\b(?:require|requires|requiring)\b.{0,40}\b(?:log[- ]?in|sign[- ]?in)\b/i,
];

function matchesAny(patterns: RegExp[], prompt: string): boolean {
	return patterns.some((pattern) => pattern.test(prompt));
}

function hasNonDefaultAuthentication(node: WorkflowNodeResponse): boolean {
	const auth = node.parameters?.authentication;
	return typeof auth === 'string' && auth !== 'none';
}

function getAuthentication(node: WorkflowNodeResponse): string {
	const auth = node.parameters?.authentication;
	return typeof auth === 'string' ? auth : '';
}

export const inboundTriggerAuthDefaults: BinaryCheck = {
	name: 'inbound_trigger_auth_defaults',
	description: 'Inbound trigger nodes keep authentication disabled unless the user asks for it',
	kind: 'deterministic',
	dimension: 'security',
	run(workflow, ctx) {
		const inboundTriggers = (workflow.nodes ?? []).filter((node) =>
			INBOUND_TRIGGER_TYPES.has(node.type),
		);
		if (inboundTriggers.length === 0) return { pass: true, applicable: false };

		const requestsInboundAuth = matchesAny(EXPLICIT_INBOUND_AUTH_PATTERNS, ctx.prompt);
		const requestsPageAuth =
			requestsInboundAuth || matchesAny(EXPLICIT_PAGE_AUTH_PATTERNS, ctx.prompt);

		const issues = inboundTriggers
			.filter((node) => !(node.type === WEBPAGE_TYPE ? requestsPageAuth : requestsInboundAuth))
			.filter(hasNonDefaultAuthentication)
			.map((node) => `"${node.name}" sets authentication to "${getAuthentication(node)}"`);

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
