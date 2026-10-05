// ---------------------------------------------------------------------------
// Read-only `agent-context` reader over the Agents a routing case seeds.
//
// The stub instance has no Agents module, so it wires no `agent-context` tool.
// A case that seeds Agents gets this reader instead, so a question about an
// attached Agent can be answered from its config, as production can. The
// shapes follow the production reader
// (packages/cli/src/modules/agents/instance-ai-agent-context.adapter.ts).
// The config schema is rendered by the production serializer. Instance-wide
// lookups (channels, integrations, attachable workflows) have no seeded data
// and return an error.
// ---------------------------------------------------------------------------

import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { AgentJsonConfigBaseSchema } from '@n8n/api-types';

import type { RoutingSeed } from './types';
// Deep relative import, like harness/stub-services.ts: the schema text must match production.
import { jsonSchemaToCompactText } from '../../../../cli/src/modules/agents/json-config/schema-text-serializer';
import type { InstanceAiAgentContextReader } from '../../src/types';

type SeedAgent = RoutingSeed['agents'][number];

const UNAVAILABLE = 'This lookup is not available in the eval instance.';

export function createStubAgentContextReader(
	agents: SeedAgent[],
	updatedAt: string = new Date().toISOString(),
): InstanceAiAgentContextReader {
	const byId = new Map(agents.map((agent) => [agent.id, agent]));
	return {
		lookup: async (input) => {
			await Promise.resolve();
			if (input.type === 'agents') {
				return {
					agents: agents.map((agent) => ({
						agentId: agent.id,
						name: agent.config.name,
						published: false,
						updatedAt,
					})),
				};
			}
			if (input.type === 'config-schema') {
				return {
					configurableProperties: jsonSchemaToCompactText(
						zodSchemaToJsonSchema(AgentJsonConfigBaseSchema),
					),
				};
			}
			if (
				input.type === 'capabilities' ||
				input.type === 'integrations' ||
				input.type === 'attachable-workflows'
			) {
				throw new Error(UNAVAILABLE);
			}

			const agent = byId.get(input.agentId);
			if (!agent) throw new Error('Agent not found.');
			const skills = agent.skills ?? {};
			switch (input.type) {
				case 'config':
					return {
						agent: {
							id: agent.id,
							name: agent.config.name,
							published: false,
							draftVersionId: 'eval-version',
							activeVersionId: null,
							updatedAt,
						},
						configState: 'current-draft',
						config: agent.config,
						configHash: null,
					};
				case 'skills':
					return {
						skills: Object.entries(skills).map(([id, skill]) => ({
							id,
							name: skill.name,
							description: skill.description,
							attached: (agent.config.skills ?? []).some((ref) => ref.id === id),
						})),
					};
				case 'skill': {
					if (!Object.hasOwn(skills, input.skillId)) throw new Error('Skill not found.');
					return { id: input.skillId, ...skills[input.skillId] };
				}
				case 'tasks':
					return { tasks: [] };
				case 'custom-tools':
					return { tools: [] };
				case 'custom-tool':
					throw new Error('Custom tool not found.');
				case 'sessions':
					return { sessions: [], nextCursor: null };
				case 'session':
					return { notFound: true };
			}
		},
	};
}
