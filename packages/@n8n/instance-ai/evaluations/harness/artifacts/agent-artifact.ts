import { sanitizeCredentialShapedValues } from '@n8n/ai-utilities';
import { agentSkillSchema, sanitizeAgentSkillBodies } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentArtifact } from '../../types';

/**
 * Validate the known skill contract without projecting away fields introduced
 * by a newer server. The original value is retained for the raw preview.
 */
function isCompatibleAgentSkill(value: unknown): boolean {
	const sanitized = sanitizeAgentSkillBodies({ skill: value });
	if (!isRecord(sanitized)) return false;
	return agentSkillSchema.safeParse(sanitized.skill).success;
}

/** Runtime boundary for structured artifacts carried through eval traces. */
export function isAgentArtifact(value: unknown): value is AgentArtifact {
	if (!isRecord(value) || !isRecord(value.config) || !isRecord(value.skills)) return false;
	if (value.agentId !== undefined && typeof value.agentId !== 'string') return false;
	return Object.values(value.skills).every(isCompatibleAgentSkill);
}

/** Redact the full forward-compatible value, then validate its known contract. */
export function sanitizeAgentArtifact(value: unknown): AgentArtifact | null {
	try {
		const redacted = sanitizeCredentialShapedValues(value);
		return isAgentArtifact(redacted) ? redacted : null;
	} catch {
		return null;
	}
}
