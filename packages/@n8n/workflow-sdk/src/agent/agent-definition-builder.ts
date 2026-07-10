import type { AgentMemoryConfig } from './agent-memory-config';
import {
	AgentSourceArtifactV1Schema,
	type AgentSourceArtifactV1,
	type AgentSourceCoreConfig,
	type AgentSourceSkill,
	type AgentSourceTool,
} from './agent-source-artifact';
import type { CredentialReference, NodeConfig, ToolInstance } from '../types/base';

export interface AgentModelReference {
	id: string;
	credential?: string;
}

export interface NodeToolOptions {
	name: string;
	description?: string;
	requireApproval?: boolean;
}

export interface WorkflowToolOptions {
	name?: string;
	description?: string;
	requireApproval?: boolean;
	allOutputs?: boolean;
}

export interface CustomToolOptions {
	requireApproval?: boolean;
}

export interface WorkflowToolReference {
	readonly _agentReferenceType: 'workflow-tool';
	readonly config: Extract<AgentSourceTool, { type: 'workflow' }>;
}

export interface CustomToolReference {
	readonly _agentReferenceType: 'custom-tool';
	readonly config: Extract<AgentSourceTool, { type: 'custom' }>;
}

export interface SkillReference {
	readonly _agentReferenceType: 'skill';
	readonly config: AgentSourceSkill;
}

export interface SubAgentReference {
	agentId: string;
	useWhen?: string;
}

export interface SubAgentSettings {
	maxChildren?: number;
	modelsByDifficulty?: Record<string, unknown>;
}

type AgentToolReference = WorkflowToolReference | CustomToolReference;

const PERMITTED_NODE_CONFIG_FIELDS = new Set<string>(['parameters', 'credentials']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertJsonCompatible(value: unknown, path: string): void {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'boolean' ||
		(typeof value === 'number' && Number.isFinite(value))
	) {
		return;
	}

	if (Array.isArray(value)) {
		value.forEach((entry, index) => assertJsonCompatible(entry, `${path}[${index}]`));
		return;
	}

	if (isRecord(value)) {
		for (const [key, entry] of Object.entries(value)) {
			assertJsonCompatible(entry, `${path}.${key}`);
		}
		return;
	}

	throw new Error(`${path} must contain only JSON-serializable values`);
}

function assertNonEmpty(value: string, label: string): void {
	if (value.trim().length === 0) throw new Error(`${label} must not be empty`);
}

function isToolInstance(value: unknown): value is ToolInstance {
	return (
		isRecord(value) &&
		value._subnodeType === 'ai_tool' &&
		typeof value.type === 'string' &&
		typeof value.version === 'string' &&
		isRecord(value.config)
	);
}

function isAgentToolReference(value: unknown): value is AgentToolReference {
	return (
		isRecord(value) &&
		(value._agentReferenceType === 'workflow-tool' ||
			value._agentReferenceType === 'custom-tool') &&
		isRecord(value.config)
	);
}

function isCredentialReference(value: unknown): value is CredentialReference {
	return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function normalizeCredentials(
	credentials: NodeConfig['credentials'],
	toolName: string,
): Record<string, CredentialReference> | undefined {
	if (!credentials) return undefined;

	const normalized: Record<string, CredentialReference> = {};
	for (const [credentialType, value] of Object.entries(credentials)) {
		if (isCredentialReference(value)) {
			normalized[credentialType] = { id: value.id, name: value.name };
			continue;
		}

		throw new Error(
			`Agent tool "${toolName}" credential "${credentialType}" must use an explicit { id, name } reference`,
		);
	}

	return normalized;
}

function sanitizeToolName(name: string): string {
	const normalized = name.replace(/[^a-zA-Z0-9_-]+/g, '_');
	return normalized.length > 64 ? normalized.slice(0, 64).replace(/[_-]+$/, '') : normalized;
}

function sanitizeWorkflowToolName(name: string): string {
	if (/^[a-zA-Z0-9_-]{1,128}$/.test(name)) return name;
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 128);
}

function getProviderToolName(config: AgentSourceTool): string {
	switch (config.type) {
		case 'custom':
			return config.id;
		case 'workflow':
			return sanitizeWorkflowToolName(config.name ?? config.workflow);
		case 'node':
			return sanitizeToolName(config.name);
	}
}

function nodeToolFromInstance(instance: ToolInstance, options: NodeToolOptions): AgentSourceTool {
	assertNonEmpty(options.name, 'Agent tool name');

	const unsupportedFields = Object.entries(instance.config)
		.filter(([key, value]) => !PERMITTED_NODE_CONFIG_FIELDS.has(key) && value !== undefined)
		.map(([key]) => key)
		.sort();
	if (unsupportedFields.length > 0) {
		throw new Error(
			`Agent tool "${options.name}" uses workflow-only config fields: ${unsupportedFields.join(', ')}`,
		);
	}

	const nodeTypeVersion = Number(instance.version);
	if (!Number.isFinite(nodeTypeVersion)) {
		throw new Error(`Agent tool "${options.name}" has invalid node version "${instance.version}"`);
	}

	const nodeParameters = instance.config.parameters ?? {};
	assertJsonCompatible(nodeParameters, `Agent tool "${options.name}" parameters`);

	return {
		type: 'node',
		name: options.name,
		...(options.description !== undefined ? { description: options.description } : {}),
		...(options.requireApproval !== undefined ? { requireApproval: options.requireApproval } : {}),
		node: {
			nodeType: instance.type,
			nodeTypeVersion,
			nodeParameters,
			...(instance.config.credentials
				? { credentials: normalizeCredentials(instance.config.credentials, options.name) }
				: {}),
		},
	};
}

export function workflowTool(
	workflowId: string,
	options: WorkflowToolOptions = {},
): WorkflowToolReference {
	assertNonEmpty(workflowId, 'Workflow id');
	if (options.name !== undefined) assertNonEmpty(options.name, 'Workflow tool name');

	return {
		_agentReferenceType: 'workflow-tool',
		config: {
			type: 'workflow',
			workflow: workflowId,
			...(options.name !== undefined ? { name: options.name } : {}),
			...(options.description !== undefined ? { description: options.description } : {}),
			...(options.requireApproval !== undefined
				? { requireApproval: options.requireApproval }
				: {}),
			...(options.allOutputs !== undefined ? { allOutputs: options.allOutputs } : {}),
		},
	};
}

export function customTool(
	customToolId: string,
	options: CustomToolOptions = {},
): CustomToolReference {
	assertNonEmpty(customToolId, 'Custom tool id');
	return {
		_agentReferenceType: 'custom-tool',
		config: {
			type: 'custom',
			id: customToolId,
			...(options.requireApproval !== undefined
				? { requireApproval: options.requireApproval }
				: {}),
		},
	};
}

export function skillRef(skillId: string): SkillReference {
	assertNonEmpty(skillId, 'Skill id');
	return {
		_agentReferenceType: 'skill',
		config: { type: 'skill', id: skillId },
	};
}

export class AgentDefinitionBuilder {
	readonly _isAgentDefinitionBuilder = true;

	private modelConfig: AgentModelReference | undefined;

	private instructionsText = '';

	private memoryConfig: AgentMemoryConfig = { enabled: false, storage: 'n8n' };

	private readonly subAgentConfigs: SubAgentReference[] = [];

	private subAgentSettingsConfig: SubAgentSettings = {};

	private readonly toolConfigs: AgentSourceTool[] = [];

	private readonly skillConfigs: AgentSourceSkill[] = [];

	private readonly providerToolConfigs: Record<string, Record<string, unknown>> = {};

	private readonly mcpServerConfigs: Array<Record<string, unknown>> = [];

	private readonly vectorStoreConfigs: Array<Record<string, unknown>> = [];

	private agentConfig: Record<string, unknown> = {};

	private readonly providerToolNames = new Set<string>();

	private readonly skillIds = new Set<string>();

	private readonly subAgentIds = new Set<string>();

	private readonly mcpServerNames = new Set<string>();

	private readonly vectorStoreToolNames = new Set<string>();

	constructor(private readonly agentName: string) {
		assertNonEmpty(agentName, 'Agent name');
	}

	model(model: AgentModelReference): this {
		assertNonEmpty(model.id, 'Model id');
		this.modelConfig = { ...model };
		return this;
	}

	instructions(instructions: string): this {
		this.instructionsText = instructions;
		return this;
	}

	tool(instance: ToolInstance, options: NodeToolOptions): this;
	tool(reference: AgentToolReference): this;
	tool(input: ToolInstance | AgentToolReference, options?: NodeToolOptions): this {
		let config: AgentSourceTool;
		if (isAgentToolReference(input)) {
			if (options !== undefined) {
				throw new Error('Reference tool options must be passed to workflowTool() or customTool()');
			}
			config = input.config;
		} else {
			if (!isToolInstance(input)) {
				throw new Error('Agent node tools must be created with the workflow SDK tool() factory');
			}
			if (!options) throw new Error('Agent node tools require an explicit name');
			config = nodeToolFromInstance(input, options);
		}

		this.assertToolNameAvailable(getProviderToolName(config));
		if (
			config.type === 'custom' &&
			this.toolConfigs.some((existing) => existing.type === 'custom' && existing.id === config.id)
		) {
			throw new Error(`Duplicate Agent custom reference: "${config.id}"`);
		}
		this.toolConfigs.push(config);
		return this;
	}

	skill(reference: SkillReference): this {
		if (this.skillIds.has(reference.config.id)) {
			throw new Error(`Duplicate Agent skill reference: "${reference.config.id}"`);
		}
		this.skillIds.add(reference.config.id);
		this.skillConfigs.push(reference.config);
		return this;
	}

	subAgent(reference: SubAgentReference): this {
		assertNonEmpty(reference.agentId, 'Sub-agent id');
		if (this.subAgentIds.has(reference.agentId)) {
			throw new Error(`Duplicate sub-agent reference: "${reference.agentId}"`);
		}
		this.subAgentIds.add(reference.agentId);
		this.subAgentConfigs.push({ ...reference });
		return this;
	}

	subAgentSettings(settings: SubAgentSettings): this {
		assertJsonCompatible(settings, 'Sub-agent settings');
		this.subAgentSettingsConfig = { ...settings };
		return this;
	}

	/** Configure session, observational, and optional cross-session Episodic Memory. */
	memory(config: AgentMemoryConfig): this {
		assertJsonCompatible(config, 'Agent memory config');
		this.memoryConfig = { ...config };
		return this;
	}

	providerTool(name: string, args: Record<string, unknown>): this {
		assertNonEmpty(name, 'Provider tool name');
		assertJsonCompatible(args, `Provider tool "${name}" config`);
		if (this.providerToolNames.has(name)) {
			throw new Error(`Duplicate provider tool: "${name}"`);
		}
		this.providerToolNames.add(name);
		this.providerToolConfigs[name] = { ...args };
		return this;
	}

	mcpServer(config: Record<string, unknown> & { name: string }): this {
		assertNonEmpty(config.name, 'MCP server name');
		assertJsonCompatible(config, `MCP server "${config.name}" config`);
		if (this.mcpServerNames.has(config.name)) {
			throw new Error(`Duplicate MCP server: "${config.name}"`);
		}
		this.mcpServerNames.add(config.name);
		this.mcpServerConfigs.push({ ...config });
		return this;
	}

	vectorStore(config: Record<string, unknown> & { name: string }): this {
		assertNonEmpty(config.name, 'Vector store name');
		assertJsonCompatible(config, `Vector store "${config.name}" config`);
		const providerToolName = sanitizeToolName(`search_${config.name}`);
		if (this.vectorStoreToolNames.has(providerToolName)) {
			throw new Error(`Duplicate vector store: "${config.name}"`);
		}
		this.assertToolNameAvailable(providerToolName);
		this.vectorStoreToolNames.add(providerToolName);
		this.vectorStoreConfigs.push({ ...config });
		return this;
	}

	configuration(config: Record<string, unknown>): this {
		assertJsonCompatible(config, 'Agent runtime config');
		this.agentConfig = { ...config };
		return this;
	}

	toAgentSource(): AgentSourceArtifactV1 {
		const core: AgentSourceCoreConfig = {
			name: this.agentName,
			model: this.modelConfig?.id ?? '',
			credential: this.modelConfig?.credential ?? '',
			instructions: this.instructionsText,
			memory: this.memoryConfig,
			subAgents: { ...this.subAgentSettingsConfig, agents: this.subAgentConfigs },
			tools: this.toolConfigs,
			skills: this.skillConfigs,
			providerTools: this.providerToolConfigs,
			mcpServers: this.mcpServerConfigs,
			vectorStores: this.vectorStoreConfigs,
			config: this.agentConfig,
		};

		return AgentSourceArtifactV1Schema.parse({
			kind: 'n8n-agent-source',
			version: 1,
			core,
			warnings: [],
		});
	}

	private assertToolNameAvailable(providerName: string): void {
		const existingNames = this.toolConfigs.map(getProviderToolName);
		if (existingNames.includes(providerName) || this.vectorStoreToolNames.has(providerName)) {
			throw new Error(`Duplicate Agent tool name: "${providerName}"`);
		}
	}
}

export function agent(name: string): AgentDefinitionBuilder {
	return new AgentDefinitionBuilder(name);
}
