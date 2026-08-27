import type { ToolDescriptor } from '@n8n/agents';
import { type AgentJsonConfig } from '@n8n/api-types';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentHistory } from '../../entities/agent-history.entity';
import type { Agent } from '../../entities/agent.entity';
import type { AgentHistoryRepository } from '../../repositories/agent-history.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SubAgentSourceResolver } from '../sub-agent-source-resolver';

const projectId = 'project-1';
const agentId = 'agent-1';
const versionId = 'version-1';

const runnableConfig: AgentJsonConfig = {
	name: 'Helper Agent',
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

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		versionId,
		schema: runnableConfig,
		integrations: [],
		tools: {},
		skills: {},
		activeVersionId: versionId,
		activeVersion: makeAgentHistory(),
		...overrides,
	} as unknown as Agent;
}

describe('SubAgentSourceResolver', () => {
	let agentRepository: Mocked<AgentRepository>;
	let agentHistoryRepository: Mocked<AgentHistoryRepository>;
	let resolver: SubAgentSourceResolver;

	beforeEach(() => {
		vi.clearAllMocks();
		agentRepository = mock<AgentRepository>();
		agentHistoryRepository = mock<AgentHistoryRepository>();
		resolver = new SubAgentSourceResolver(agentRepository, agentHistoryRepository);
	});

	it('resolves the current published version of a saved n8n agent when no version is pinned', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).resolves.toMatchObject({
			source: {
				sourceId: agentId,
				versionId,
				config: runnableConfig,
			},
		});
	});

	it('resolves a saved n8n agent version', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(makeAgentHistory());

		await expect(
			resolver.resolveForRuntime({ agentId, versionId }, { projectId }),
		).resolves.toMatchObject({
			source: {
				sourceId: agentId,
				versionId,
				config: runnableConfig,
			},
		});
	});

	it('resolves runtime assets from the published version, not the draft', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				// Draft-only assets that must NOT be used for an unpinned delegation.
				tools: {
					draft_only_tool: {
						code: 'return "draft";',
						descriptor: { ...customToolDescriptor, name: 'draft_only_tool' },
					},
				},
				skills: {},
				activeVersion: makeAgentHistory({
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
			}),
		);

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).resolves.toMatchObject({
			source: {
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

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).rejects.toThrow(
			`Agent "${agentId}" not found`,
		);
	});

	it('rejects a sub-agent with no published version when no version is pinned', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersionId: null, activeVersion: null }),
		);

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).rejects.toThrow(
			`Sub-agent "${agentId}" is not published`,
		);
	});

	it('rejects a sub-agent whose published version has no schema', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersion: makeAgentHistory({ schema: null }) }),
		);

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).rejects.toThrow(
			`Sub-agent "${agentId}" is not published`,
		);
	});

	it('rejects a pinned version that does not exist', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(null);

		await expect(resolver.resolveForRuntime({ agentId, versionId }, { projectId })).rejects.toThrow(
			`Version "${versionId}" not found for agent "${agentId}"`,
		);
	});

	it('rejects a resolved config that is not runnable', async () => {
		const { credential: _credential, ...invalidConfig } = runnableConfig;
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersion: makeAgentHistory({ schema: invalidConfig }) }),
		);

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).rejects.toThrow(
			'Invalid sub-agent config',
		);
	});
});
