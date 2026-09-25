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
		name: 'Helper Agent',
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

	it('resolves the latest draft when no version is pinned', async () => {
		const draftConfig = { ...runnableConfig, instructions: 'Use the current draft.' };
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				schema: draftConfig,
				activeVersion: makeAgentHistory({
					schema: { ...runnableConfig, instructions: 'Use the published snapshot.' },
				}),
			}),
		);

		const result = await resolver.resolveForRuntime({ agentId }, { projectId });

		expect(result.source).toEqual({
			sourceId: agentId,
			config: draftConfig,
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

	it('pins a resumed version over the currently published one in production runs', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersion: makeAgentHistory({ versionId: 'version-newer' }) }),
		);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(makeAgentHistory());

		await expect(
			resolver.resolveForRuntime({ agentId, versionId }, { projectId, usePublishedVersion: true }),
		).resolves.toMatchObject({
			source: { sourceId: agentId, versionId },
		});
	});

	it('resolves the published version with its assets for production runs', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				schema: { ...runnableConfig, instructions: 'Use the current draft.' },
				activeVersion: makeAgentHistory({
					schema: { ...runnableConfig, instructions: 'Use the published snapshot.' },
					tools: {
						published_tool: {
							code: 'return "published";',
							descriptor: { ...customToolDescriptor, name: 'published_tool' },
						},
					},
				}),
			}),
		);

		const result = await resolver.resolveForRuntime(
			{ agentId },
			{ projectId, usePublishedVersion: true },
		);

		expect(result.source).toEqual({
			sourceId: agentId,
			versionId,
			config: { ...runnableConfig, instructions: 'Use the published snapshot.' },
		});
		expect(result.toolCodeByName).toEqual({ published_tool: 'return "published";' });
	});

	it('rejects a never-published sub-agent in production runs', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersionId: null, activeVersion: null }),
		);

		await expect(
			resolver.resolveForRuntime({ agentId }, { projectId, usePublishedVersion: true }),
		).rejects.toThrow(
			'Sub-agent "Helper Agent" is not published. Publish it before delegating to it in a production run.',
		);
	});

	it('resolves runtime assets from the draft, not the published version', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				tools: {
					draft_only_tool: {
						code: 'return "draft";',
						descriptor: { ...customToolDescriptor, name: 'draft_only_tool' },
					},
				},
				skills: {
					draft_skill: {
						name: 'Draft skill',
						description: 'Draft description',
						instructions: 'Draft body',
					},
				},
				activeVersion: makeAgentHistory({
					tools: {
						published_tool: {
							code: 'return "published";',
							descriptor: { ...customToolDescriptor, name: 'published_tool' },
						},
					},
					skills: {
						published_skill: {
							name: 'Published skill',
							description: 'Published description',
							instructions: 'Published body',
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
				draft_only_tool: { ...customToolDescriptor, name: 'draft_only_tool' },
			},
			toolCodeByName: {
				draft_only_tool: 'return "draft";',
			},
			skills: {
				draft_skill: {
					name: 'Draft skill',
					description: 'Draft description',
					instructions: 'Draft body',
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

	it('resolves a never-published draft', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersionId: null, activeVersion: null }),
		);

		const result = await resolver.resolveForRuntime({ agentId }, { projectId });

		expect(result.source).toEqual({ sourceId: agentId, config: runnableConfig });
	});

	it('rejects a sub-agent whose draft has no schema', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: null }));

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).rejects.toThrow(
			`Sub-agent "${agentId}" has no config`,
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
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: invalidConfig }));

		await expect(resolver.resolveForRuntime({ agentId }, { projectId })).rejects.toThrow(
			'Invalid sub-agent config',
		);
	});
});
