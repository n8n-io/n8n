import type { GuardrailStop } from '@n8n/agents';
import { APICallError } from 'ai';

/** The gateway rejects an empty wallet with a 402 before any upstream call, from a cached check. */
const GATEWAY_DEPLETED_STATUS = 402;

function mentionsDepletedCredits(error: APICallError): boolean {
	const haystacks = [error.message, error.responseBody ?? ''];
	return haystacks.some((text) => text.toLowerCase().includes('depleted'));
}

/**
 * Maps the AI gateway's depleted-credits rejection to the `budget.credits`
 * guardrail stop, so the run ends with the top-up flow instead of a generic
 * model error. Only the exact gateway signature (402 + a depleted message)
 * maps — every other error keeps the default error finish.
 */
export function classifyGatewayError(error: unknown): GuardrailStop | undefined {
	if (!APICallError.isInstance(error)) return undefined;
	if (error.statusCode !== GATEWAY_DEPLETED_STATUS) return undefined;
	if (!mentionsDepletedCredits(error)) return undefined;
	return { code: 'budget.credits' };
}
