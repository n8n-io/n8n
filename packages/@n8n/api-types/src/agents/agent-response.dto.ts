import '../openapi-extend';

import { z } from 'zod';

import { Z } from '../zod-class';
import { alsoNullable } from '../dto/openapi-nullable';
import { objectGuardSchema } from '../schemas/object-guard.schema';
import type { AgentJsonConfig } from './agent-json-config.schema';
import type { AgentIntegrationConfig } from './agent-integration.schema';
import type { AgentSkill, AgentSkillVersionInfo } from './types';

const agentPublicShape = {
	id: z.string(),
	name: z.string(),
	projectId: z.string(),
	project: z.object({ id: z.string(), name: z.string(), type: z.string() }).nullable(),
	availableInMCP: z.boolean(),
	isArchived: z.boolean(),
	versionId: z.string().nullable(),
	activeVersionId: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	// Stored rows can predate the current input schema.
	config: objectGuardSchema<AgentJsonConfig>()
		.nullable()
		.openapi(alsoNullable({ type: 'object' })),
	configHash: z.string().nullable(),
	tools: z.record(
		objectGuardSchema<{ code: string; descriptor: { name: string } }>().openapi({ type: 'object' }),
	),
	activeVersion: z
		.object({
			versionId: z.string(),
			integrations: z.array(
				objectGuardSchema<AgentIntegrationConfig>().openapi({ type: 'object' }),
			),
		})
		.nullable(),
};

export class AgentPublicDto extends Z.class(agentPublicShape) {}

export class AgentDto extends AgentPublicDto.extend({
	isRunnable: z.boolean(),
	hasPublishHistory: z.boolean(),
	hasVersionHistory: z.boolean(),
	skills: z.record(objectGuardSchema<AgentSkill>()),
	skillHashes: z.record(z.string()),
	outdatedSkillIds: z.array(z.string()),
	skillVersions: z.record(objectGuardSchema<AgentSkillVersionInfo>()),
}) {}

export class CreatedAgentPublicDto extends AgentPublicDto {}
