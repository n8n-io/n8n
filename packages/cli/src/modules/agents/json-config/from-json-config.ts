import type {
	AgentBuilder,
	BuiltMemory,
	BuiltTool,
	CredentialProvider,
	ModelConfig,
	ToolDescriptor,
	JSONObject,
} from '@n8n/agents';
import { Agent, Memory, Tool, wrapToolForApproval } from '@n8n/agents';
import type { AgentSkill } from '@n8n/api-types';
import { z } from 'zod';

import type {
	AgentJsonConfig,
	AgentJsonConfigRef,
	AgentJsonMemoryConfig,
	AgentJsonToolConfig,
} from './agent-json-config';
import { mapCredentialForProvider } from './credential-field-mapping';
import { resolveProviderToolName } from './provider-tool-aliases';

export type ToolResolver = (
	toolSchema: AgentJsonToolConfig,
) => Promise<BuiltTool | null | undefined>;

export interface ToolExecutor {
	executeTool(toolName: string, input: unknown, ctx: unknown): Promise<unknown>;
	executeToMessageSync?(toolName: string, output: unknown): unknown;
}

/** Factory function that reconstructs a BuiltMemory backend from serialized params. */
export type MemoryFactory = (params: AgentJsonMemoryConfig) => BuiltMemory | Promise<BuiltMemory>;

export interface BuildFromJsonOptions {
	/** Executes custom tool handlers inside isolates. */
	toolExecutor: ToolExecutor;
	credentialProvider: CredentialProvider;
	/** Resolves workflow/node tool refs into BuiltTool instances. */
	resolveTool?: ToolResolver;
	/** Stored skill bodies keyed by skill id. Only refs present in config.skills are attached. */
	skills?: Record<string, AgentSkill>;
	/** Memory backend factories keyed by storage preset name. */
	memoryFactory: MemoryFactory;
}

/**
 * Build a live Agent from an AgentJsonConfig + tool descriptors.
 *
 * This is the JSON-config execution path — lighter than fromSchema() because
 * there are no source strings to evaluate. Custom tool handlers are dispatched
 * individually per tool-id via the ToolExecutor.
 */
export async function buildFromJson(
	config: AgentJsonConfig,
	toolDescriptors: Record<string, ToolDescriptor>,
	options: BuildFromJsonOptions,
): Promise<Agent> {
	const agent = new Agent(config.name);

	// Derive the provider prefix for credential field remapping.
	const slashIdx = config.model.indexOf('/');
	const providerPrefix = slashIdx !== -1 ? config.model.slice(0, slashIdx) : '';

	// Resolve credentials upfront and embed them directly in the model config
	// object so createModel() receives the full set of fields it needs.
	if (config.credential) {
		const raw = await options.credentialProvider.resolve(config.credential);
		const mapped = mapCredentialForProvider(providerPrefix, raw);
		agent.model({ id: config.model, ...mapped } as ModelConfig);
	} else {
		agent.model(config.model);
	}

	const configuredSkills = getConfiguredSkills(config.skills ?? [], options.skills ?? {});
	agent.instructions(withSkillCatalog(config.instructions, configuredSkills));

	// Tools
	if (config.tools) {
		for (const ref of config.tools) {
			const built = await resolveToolRef(ref, toolDescriptors, options);
			if (built) {
				agent.tool(built);
			}
		}
	}
	if (configuredSkills.length > 0) {
		agent.tool(createLoadSkillTool(configuredSkills));
	}

	// Provider tools
	if (config.providerTools) {
		for (const [name, args] of Object.entries(config.providerTools)) {
			const resolved = resolveProviderToolName(name);
			agent.providerTool({ name: resolved as `${string}.${string}`, args });
		}
	}

	// Memory
	if (config.memory?.enabled) {
		await applyMemoryFromConfig(agent, config.memory, options.memoryFactory);
	}

	// Config options
	if (config.config) {
		if (config.config.thinking) {
			const { provider, ...rest } = config.config.thinking;
			agent.thinking(provider, rest);
		}
		if (config.config.toolCallConcurrency) {
			agent.toolCallConcurrency(config.config.toolCallConcurrency);
		}
		if (config.config.requireToolApproval) {
			agent.requireToolApproval();
		}
	}

	return agent;
}

type ConfiguredSkill = { id: string; skill: AgentSkill };

function getConfiguredSkills(
	refs: Array<Extract<AgentJsonConfigRef, { type: 'skill' }>>,
	skills: Record<string, AgentSkill>,
): ConfiguredSkill[] {
	const seen = new Set<string>();
	const configured: ConfiguredSkill[] = [];

	for (const ref of refs) {
		if (seen.has(ref.id)) continue;
		seen.add(ref.id);
		const skill = skills[ref.id];
		if (!skill) throw new Error(`Skill "${ref.id}" not found in stored skill bodies`);
		configured.push({ id: ref.id, skill });
	}

	return configured;
}

function withSkillCatalog(instructions: string, skills: ConfiguredSkill[]): string {
	if (skills.length === 0) return instructions;

	const catalog = skills
		.map(({ id, skill }) => `- ${id}: ${skill.name} - ${skill.description}`)
		.join('\n');
	const baseInstructions = instructions.trimEnd();

	return `${baseInstructions}${baseInstructions ? '\n\n' : ''}Available skills:
${catalog}

If the user's task matches a skill description, call load_skill with the skill id before applying that skill. Skill bodies are intentionally not included here; load them only when relevant.`;
}

function createLoadSkillTool(skills: ConfiguredSkill[]): BuiltTool {
	const skillsById = new Map(skills.map(({ id, skill }) => [id, skill]));

	return new Tool('load_skill')
		.description(
			'Load the full instructions for an attached skill when its name or description matches the current task. ' +
				'Use this before applying a skill; available skill ids are listed in the system instructions.',
		)
		.input(
			z.object({
				skillId: z.string().describe('The skill id from the Available skills list'),
			}),
		)
		.handler(async ({ skillId }: { skillId: string }) => {
			const skill = skillsById.get(skillId);
			if (!skill) {
				return {
					ok: false,
					error: `Skill "${skillId}" is not attached to this agent.`,
				};
			}

			return {
				ok: true,
				skillId,
				name: skill.name,
				description: skill.description,
				instructions: skill.instructions,
			};
		})
		.build();
}

async function resolveToolRef(
	ref: AgentJsonToolConfig,
	descriptors: Record<string, ToolDescriptor>,
	options: BuildFromJsonOptions,
): Promise<BuiltTool | null> {
	switch (ref.type) {
		case 'custom': {
			const descriptor = descriptors[ref.id];
			if (!descriptor) {
				throw new Error(`Custom tool "${ref.id}" not found in tool descriptors`);
			}

			const builtTool: BuiltTool = {
				name: descriptor.name,
				description: descriptor.description,
				inputSchema: descriptor.inputSchema ?? undefined,
				handler: async (input, ctx) => {
					return await options.toolExecutor.executeTool(descriptor.name, input, {
						resumeData: 'resumeData' in ctx ? ctx.resumeData : undefined,
						parentTelemetry: ctx.parentTelemetry,
					});
				},
				providerOptions: descriptor.providerOptions as Record<string, JSONObject> | undefined,
			};

			if (ref.requireApproval) {
				return wrapToolForApproval(builtTool, { requireApproval: true });
			}
			return builtTool;
		}

		case 'workflow': {
			const marker: BuiltTool = {
				name: ref.name ?? ref.workflow,
				description: ref.description ?? `Execute the "${ref.workflow}" workflow`,
				editable: false,
				metadata: {
					workflowTool: true,
					workflowName: ref.workflow,
					options: { name: ref.name, description: ref.description },
				},
			};
			const tool = (await options.resolveTool?.(ref)) ?? marker;
			if (ref.requireApproval) {
				return wrapToolForApproval(tool, { requireApproval: true });
			}
			return tool;
		}

		case 'node': {
			const marker: BuiltTool = {
				name: ref.name,
				description: ref.description ?? `Execute node ${ref.name}`,
				editable: false,
				metadata: { nodeTool: true, ...ref.node },
			};
			const tool = (await options.resolveTool?.(ref)) ?? marker;
			if (ref.requireApproval) {
				return wrapToolForApproval(tool, { requireApproval: true });
			}
			return tool;
		}
	}
}

async function applyMemoryFromConfig(
	agent: AgentBuilder,
	memoryConfig: AgentJsonMemoryConfig,
	memoryFactory: MemoryFactory,
) {
	const memory = new Memory();

	const builtMemory = memoryFactory(memoryConfig);
	memory.storage(await Promise.resolve(builtMemory));

	if (memoryConfig.lastMessages) {
		memory.lastMessages(memoryConfig.lastMessages);
	}

	if (memoryConfig.semanticRecall) {
		memory.semanticRecall(memoryConfig.semanticRecall);
	}

	memory.titleGeneration({ sync: true });

	agent.memory(memory);
}
