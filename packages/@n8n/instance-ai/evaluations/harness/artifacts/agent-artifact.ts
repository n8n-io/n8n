import { sanitizeCredentialShapedValues } from '@n8n/ai-utilities';
import {
	AgentJsonConfigSchema,
	agentSkillSchema,
	sanitizeAgentJsonConfig,
	sanitizeAgentSkillBodies,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentArtifact } from '../../types';

const utf8Encoder = new TextEncoder();

export const AGENT_ARTIFACT_ITERATION_CAP_BYTES = 262_144;
export const AGENT_ARTIFACT_CASE_CAP_BYTES = 524_288;

function agentArtifactUtf8Bytes(artifact: AgentArtifact): number {
	return utf8Encoder.encode(JSON.stringify(artifact)).byteLength;
}

/**
 * Validate the known skill contract without projecting away fields introduced
 * by a newer server. The original value is retained for the preview.
 */
function isCompatibleAgentSkill(value: unknown): boolean {
	const sanitized = sanitizeAgentSkillBodies({ skill: value });
	if (!isRecord(sanitized)) return false;
	return agentSkillSchema.safeParse(sanitized.skill).success;
}

/** The redactor must preserve the artifact structure, but not config validity. */
function isRedactedAgentArtifact(value: unknown): value is AgentArtifact {
	if (!isRecord(value)) return false;
	const { config, skills, agentId } = value;
	if (!isRecord(config) || !isRecord(skills)) return false;
	if (agentId !== undefined && typeof agentId !== 'string') return false;
	return Object.values(skills).every(isCompatibleAgentSkill);
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/** Restore a schema-compatible container after credential redaction replaces it with a sentinel. */
function normalizeRedactedNodeCredentials(
	config: Record<string, unknown>,
): Record<string, unknown> {
	if (!isUnknownArray(config.tools)) return config;

	const tools = config.tools.map((tool) => {
		if (
			!isRecord(tool) ||
			tool.type !== 'node' ||
			!isRecord(tool.node) ||
			tool.node.credentials !== '[REDACTED]'
		) {
			return tool;
		}
		return { ...tool, node: { ...tool.node, credentials: {} } };
	});
	return { ...config, tools };
}

/** Runtime boundary for structured artifacts carried through eval traces. */
export function isAgentArtifact(value: unknown): value is AgentArtifact {
	if (!isRecord(value)) return false;
	const { config, skills, agentId } = value;
	if (!isRecord(config) || !isRecord(skills)) return false;
	if (agentId !== undefined && typeof agentId !== 'string') return false;
	const configForValidation = normalizeRedactedNodeCredentials(config);
	if (!AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(configForValidation)).success) {
		return false;
	}
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

/** Redact an artifact for the judge without applying export-only validation or size limits. */
export function redactAgentArtifact(value: AgentArtifact): AgentArtifact {
	const redacted = sanitizeCredentialShapedValues(value);
	if (!isRedactedAgentArtifact(redacted)) {
		throw new UnexpectedError('Agent artifact redaction changed the artifact structure');
	}
	return redacted;
}

/** Validate the artifact, then apply idempotent redaction and the per-iteration export cap. */
export function sanitizeAgentArtifact(value: unknown): AgentArtifact | null {
	if (!isAgentArtifact(value)) return null;
	const redacted = redactAgentArtifact(value);
	return agentArtifactUtf8Bytes(redacted) <= AGENT_ARTIFACT_ITERATION_CAP_BYTES ? redacted : null;
}
