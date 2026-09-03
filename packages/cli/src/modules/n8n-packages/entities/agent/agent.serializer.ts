import { Service } from '@n8n/di';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { composeJsonConfig } from '@/modules/agents/json-config/agent-config-composition';

import {
	serializedAgentSchema,
	type SerializedAgent,
	type SerializedAgentFile,
	type SerializedAgentTask,
} from '../../spec/serialized/agent.schema';
import { definePackageSerializationPayload } from '../package-serialization.types';

type AgentPackageKeyHandling = {
	id: 'copy';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	name: 'copy';
	project: 'exclude';
	projectId: 'exclude';
	schema: 'transform';
	integrations: 'transform';
	tools: 'copy';
	skills: 'copy';
	availableInMCP: 'copy';
	setupCompletedAt: 'exclude';
	versionId: 'exclude';
	activeVersionId: 'exclude';
	activeVersion: 'exclude';
	revision: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	Agent,
	SerializedAgent,
	AgentPackageKeyHandling
>();

@Service()
export class AgentSerializer {
	serialize(
		agent: Agent,
		extras: { tasks: SerializedAgentTask[]; files: SerializedAgentFile[] },
	): SerializedAgent {
		return serializedAgentSchema.parse(
			serializePayload({
				id: agent.id,
				name: agent.name,
				// `schema` and `integrations` fold into the composed config, the same
				// shape the config API serves; import decomposes them again.
				config: composeJsonConfig(agent),
				tools: agent.tools ?? {},
				skills: agent.skills ?? {},
				availableInMCP: agent.availableInMCP,
				tasks: extras.tasks,
				files: extras.files,
			}),
		);
	}
}
