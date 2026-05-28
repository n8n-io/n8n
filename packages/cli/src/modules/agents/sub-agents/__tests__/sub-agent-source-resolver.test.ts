import { type AgentJsonConfig } from '@n8n/api-types';
import type { ToolDescriptor } from '@n8n/agents';
import { mock } from 'jest-mock-extended';

import type { AgentHistory } from '../../entities/agent-history.entity';
import type { Agent } from '../../entities/agent.entity';
import type { AgentHistoryRepository } from '../../repositories/agent-history.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import { BUILT_IN_SUB_AGENTS } from '../built-in-sub-agents';
import { applySubAgentOverrides, SubAgentSourceResolver } from '../sub-agent-source-resolver';

const projectId = 'project-1';
const agentId = 'agent-1';
const versionId = 'version-1';

const runnableConfig: AgentJsonConfig = {
	name: 'Helper Agent',
	description: 'Helps with delegated work',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'credential-1',
	instructions: 'Be useful.',
	config: {
		maxIterations: 5,
	},
};

const customToolDescriptor: ToolDescriptor = {
	name: 'lookup_customer',
	description: 'Look up a customer',
	systemInstruction: null,
	inputSchema: {
		type: 'object',
		properties: {},
	},
	outputSchema: null,
	hasSuspend: false,
	hasResume: false,
	hasToMessage: false,
	requireApproval: false,
	providerOptions: null,
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		versionId,
		schema: runnableConfig,
		integrations: [],
		tools: {},
		skills: {},
		...overrides,
	} as unknown as Agent;
}

function makeAgentHistory(overrides: Partial<AgentHistory> = {}): AgentHistory {
	return {
		agentId,
		versionId,
		schema: runnableConfig,
		tools: {},
		skills: {},
		...overrides,
	} as unknown as AgentHistory;
}

describe('SubAgentSourceResolver', () => {
	let agentRepository: jest.Mocked<AgentRepository>;
	let agentHistoryRepository: jest.Mocked<AgentHistoryRepository>;
	let resolver: SubAgentSourceResolver;

	beforeEach(() => {
		jest.clearAllMocks();
		agentRepository = mock<AgentRepository>();
		agentHistoryRepository = mock<AgentHistoryRepository>();
		resolver = new SubAgentSourceResolver(agentRepository, agentHistoryRepository);
	});

	afterEach(() => {
		delete BUILT_IN_SUB_AGENTS.researcher;
	});

	it('resolves an inline config when it is runnable', async () => {
		await expect(
			resolver.resolve({ type: 'inline', config: runnableConfig }, { projectId }),
		).resolves.toEqual({
			type: 'inline',
			config: runnableConfig,
		});
	});

	it('rejects an inline config that is not runnable', async () => {
		const { credential: _credential, ...invalidConfig } = runnableConfig;

		await expect(
			resolver.resolve({ type: 'inline', config: invalidConfig }, { projectId }),
		).rejects.toThrow('Invalid sub-agent config');
	});

	it('rejects an unknown built-in source', async () => {
		await expect(
			resolver.resolve({ type: 'built-in', id: 'missing' }, { projectId }),
		).rejects.toThrow('Built-in sub-agent "missing" not found');
	});

	it('resolves a built-in source with shallow config overrides', async () => {
		BUILT_IN_SUB_AGENTS.researcher = runnableConfig;

		await expect(
			resolver.resolve(
				{
					type: 'built-in',
					id: 'researcher',
					overrides: {
						instructions: 'Use a sharper research style.',
						config: { maxIterations: 8 },
					},
				},
				{ projectId },
			),
		).resolves.toMatchObject({
			type: 'built-in',
			sourceId: 'researcher',
			config: {
				...runnableConfig,
				instructions: 'Use a sharper research style.',
				config: { maxIterations: 8 },
			},
		});
	});

	it('resolves a saved draft n8n agent in the same project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

		await expect(resolver.resolve({ type: 'n8n-agent', agentId }, { projectId })).resolves.toEqual({
			type: 'n8n-agent',
			sourceId: agentId,
			versionId,
			config: {
				...runnableConfig,
				integrations: [],
			},
		});
	});

	it('resolves a saved n8n agent version', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(makeAgentHistory());

		await expect(
			resolver.resolve({ type: 'n8n-agent', agentId, versionId }, { projectId }),
		).resolves.toEqual({
			type: 'n8n-agent',
			sourceId: agentId,
			versionId,
			config: runnableConfig,
		});
	});

	it('resolves runtime assets for saved n8n agent drafts', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				tools: {
					tool_1: {
						code: 'return input;',
						descriptor: customToolDescriptor,
					},
				},
				skills: {
					skill_1: {
						name: 'Skill 1',
						description: 'Helps with tests',
						instructions: 'Skill body',
					},
				},
			}),
		);

		await expect(
			resolver.resolveForRuntime({ type: 'n8n-agent', agentId }, { projectId }),
		).resolves.toMatchObject({
			source: {
				type: 'n8n-agent',
				sourceId: agentId,
			},
			toolDescriptors: {
				tool_1: customToolDescriptor,
			},
			toolCodeByName: {
				lookup_customer: 'return input;',
			},
			skills: {
				skill_1: {
					name: 'Skill 1',
					description: 'Helps with tests',
					instructions: 'Skill body',
				},
			},
		});
	});

	it('rejects missing or inaccessible n8n agents', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(resolver.resolve({ type: 'n8n-agent', agentId }, { projectId })).rejects.toThrow(
			`Agent "${agentId}" not found`,
		);
	});

	it('rejects n8n agents with no config', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: null }));

		await expect(resolver.resolve({ type: 'n8n-agent', agentId }, { projectId })).rejects.toThrow(
			`Agent "${agentId}" has no config`,
		);
	});

	it('applies overrides before validating n8n agent config', async () => {
		const { credential: _credential, ...missingCredentialConfig } = runnableConfig;
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ schema: missingCredentialConfig }),
		);

		await expect(
			resolver.resolve(
				{
					type: 'n8n-agent',
					agentId,
					overrides: { credential: 'credential-override' },
				},
				{ projectId },
			),
		).resolves.toMatchObject({
			config: { credential: 'credential-override' },
		});
	});
});

describe('applySubAgentOverrides', () => {
	it('merges top-level fields and the nested config block', () => {
		expect(
			applySubAgentOverrides(runnableConfig, {
				description: 'Override description',
				config: { toolCallConcurrency: 3 },
			}),
		).toEqual({
			...runnableConfig,
			description: 'Override description',
			config: {
				maxIterations: 5,
				toolCallConcurrency: 3,
			},
		});
	});
});
