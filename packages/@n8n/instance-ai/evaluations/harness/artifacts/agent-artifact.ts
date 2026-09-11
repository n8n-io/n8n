import { sanitizeCredentialShapedValues } from '@n8n/ai-utilities';
import {
	AgentJsonConfigSchema,
	agentSkillSchema,
	sanitizeAgentJsonConfig,
	sanitizeAgentSkillBodies,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentArtifact } from '../../types';

const utf8Encoder = new TextEncoder();

export const AGENT_ARTIFACT_ITERATION_CAP_BYTES = 262_144;
export const AGENT_ARTIFACT_RUN_CAP_BYTES = 524_288;

function agentArtifactUtf8Bytes(artifact: AgentArtifact): number {
	return utf8Encoder.encode(JSON.stringify(artifact)).byteLength;
}

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
	if (!isRecord(value)) return false;
	const { config, skills, agentId } = value;
	if (!isRecord(config) || !isRecord(skills)) return false;
	if (agentId !== undefined && typeof agentId !== 'string') return false;
	if (!AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(config)).success) return false;
	const skillRefs = config.skills;
	if (
		skillRefs !== undefined &&
		(!Array.isArray(skillRefs) ||
			skillRefs.some(
				(ref) =>
					!isRecord(ref) ||
					ref.type !== 'skill' ||
					typeof ref.id !== 'string' ||
					!Object.hasOwn(skills, ref.id),
			))
	) {
		return false;
	}
	return Object.values(skills).every(isCompatibleAgentSkill);
}

/** Redact the full forward-compatible value, then validate its known contract. */
export function sanitizeAgentArtifact(value: unknown): AgentArtifact | null {
	try {
		const redacted = sanitizeCredentialShapedValues(value);
		if (!isAgentArtifact(redacted)) return null;
		return agentArtifactUtf8Bytes(redacted) <= AGENT_ARTIFACT_ITERATION_CAP_BYTES ? redacted : null;
	} catch {
		return null;
	}
}
