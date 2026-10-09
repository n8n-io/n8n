import { Service } from '@n8n/di';
import type { z } from 'zod';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { composeJsonConfig } from '@/modules/agents/json-config/agent-config-composition';
import type { AgentDefinition } from '@/modules/agents/utils/agent-definition';

import {
	serializedAgentMetadataSchema,
	serializedAgentSchema,
	type SerializedAgent,
	type SerializedAgentMetadata,
} from '../../spec/serialized/agent.schema';
import { PackageExportBlockedError } from '../package-export.errors';
import { definePackageSerializationPayload } from '../package-serialization.types';

type AgentPackageKeyHandling = {
	id: 'copy';
	name: 'copy';
	schema: 'transform';
	integrations: 'transform';
	tools: 'transform';
	skills: 'transform';
	availableInMCP: 'copy';
	project: 'exclude';
	projectId: 'exclude';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	versionId: 'exclude';
	activeVersionId: 'exclude';
	activeVersion: 'exclude';
	revision: 'exclude';
	setupCompletedAt: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	Agent,
	z.input<typeof serializedAgentSchema>,
	AgentPackageKeyHandling
>();

type AgentMetadataKeyHandling = Record<
	Exclude<keyof AgentPackageKeyHandling, 'versionId' | 'activeVersionId'>,
	'exclude'
> & {
	versionId: 'copy';
	activeVersionId: 'transform';
};

const serializeMetadataPayload = definePackageSerializationPayload<
	Agent,
	SerializedAgentMetadata,
	AgentMetadataKeyHandling
>();

@Service()
export class AgentSerializer {
	serialize(
		agent: Pick<Agent, 'id' | 'name' | 'availableInMCP'>,
		definition: AgentDefinition,
		integrations: Agent['integrations'],
	): SerializedAgent {
		const config = composeJsonConfig({ schema: definition.schema, integrations });
		const content = serializedAgentSchema.parse(
			serializePayload({
				id: agent.id,
				name: agent.name,
				config,
				availableInMCP: agent.availableInMCP,
				skills: this.referencedBodies(agent.id, 'skill', config?.skills ?? [], definition.skills),
				tools: this.referencedBodies(
					agent.id,
					'custom tool',
					config?.tools?.filter((tool) => tool.type === 'custom') ?? [],
					definition.tools,
				),
				tasks: this.referencedBodies(
					agent.id,
					'task',
					config?.tasks ?? [],
					Object.fromEntries(definition.tasks),
				),
			}),
		);

		// Tool JSON schemas and provider options can retain references after validation.
		return structuredClone(content);
	}

	serializeMetadata(source: Pick<Agent, 'versionId' | 'activeVersionId'>): SerializedAgentMetadata {
		return serializedAgentMetadataSchema.parse(
			serializeMetadataPayload({
				versionId: source.versionId,
				publishedVersionId: source.activeVersionId,
			}),
		);
	}

	private referencedBodies<T>(
		agentId: string,
		kind: string,
		references: Array<{ id: string }>,
		bodies: Record<string, T>,
	): Record<string, T> {
		return Object.fromEntries(
			references.map(({ id }) => {
				const body = Object.hasOwn(bodies, id) ? bodies[id] : undefined;
				if (body === undefined) {
					throw new PackageExportBlockedError(
						`Agent "${agentId}" references missing ${kind} "${id}". Export aborted.`,
					);
				}
				return [id, body];
			}),
		);
	}
}
