import type { ToolDescriptor } from '@n8n/agents';
import { type AgentJsonConfig } from '@n8n/api-types';
import { UnexpectedError, UserError } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentHistory } from '../../entities/agent-history.entity';
import type { Agent } from '../../entities/agent.entity';
import type { AgentHistoryRepository } from '../../repositories/agent-history.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { SkillHubService } from '../../skills-hub/skill-hub.service';
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
	let skillHub: Mocked<SkillHubService>;
	let resolver: SubAgentSourceResolver;

	beforeEach(() => {
		vi.clearAllMocks();
		agentRepository = mock<AgentRepository>();
		agentHistoryRepository = mock<AgentHistoryRepository>();
		skillHub = mock<SkillHubService>();
		skillHub.resolveDraftSkills.mockResolvedValue({});
		skillHub.resolvePinnedSkills.mockResolvedValue({});
		resolver = new SubAgentSourceResolver(agentRepository, agentHistoryRepository, skillHub);
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

	it('retains background configuration and tool bodies after a draft edit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				tools: {
					lookup: { descriptor: customToolDescriptor, code: 'original tool body' },
				},
			}),
		);
		skillHub.resolveDraftSkills.mockResolvedValueOnce({
			original_skill: {
				name: 'Original skill',
				description: 'Original description',
				instructions: 'Original skill body',
			},
		});
		const original = await resolver.resolveForRuntime({ agentId }, { projectId });
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ schema: { name: 'Incomplete draft', model: '', instructions: '' }, tools: {} }),
		);
		const resumed = await resolver.resolveForRuntime(
			{ agentId },
			{ projectId, runtimeSnapshot: JSON.stringify(original) },
		);
		expect(resumed).toEqual(original);
		expect(resumed.skills).toEqual({
			original_skill: {
				name: 'Original skill',
				description: 'Original description',
				instructions: 'Original skill body',
			},
		});
		expect(skillHub.resolveDraftSkills).toHaveBeenCalledTimes(1);
		const mismatchedSnapshot = resolver.resolveForRuntime(
			{ agentId },
			{
				projectId,
				runtimeSnapshot: JSON.stringify({
					...original,
					source: { ...original.source, sourceId: 'agent-2' },
				}),
			},
		);
		await expect(mismatchedSnapshot).rejects.toThrow(UserError);
		await expect(mismatchedSnapshot).rejects.toThrow(
			'Saved background task configuration does not match this agent',
		);
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		await expect(
			resolver.resolveForRuntime(
				{ agentId },
				{ projectId, runtimeSnapshot: JSON.stringify(original) },
			),
		).rejects.toThrow();
	});

	it.each([
		['empty snapshot', ''],
		['invalid JSON', '{'],
		['null snapshot', 'null'],
		['missing source', '{}'],
		['null source', '{"source":null}'],
		['missing source ID', JSON.stringify({ source: { config: runnableConfig } })],
		['invalid config', JSON.stringify({ source: { sourceId: agentId, config: {} } })],
	])('rejects saved background configuration with %s', async (_description, runtimeSnapshot) => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

		const result = resolver.resolveForRuntime({ agentId }, { projectId, runtimeSnapshot });

		await expect(result).rejects.toThrow(UnexpectedError);
		await expect(result).rejects.toThrow('Invalid saved background task configuration');
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
		expect(skillHub.resolvePinnedSkills).toHaveBeenCalledWith(versionId);
		expect(skillHub.resolveDraftSkills).not.toHaveBeenCalled();
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
				activeVersion: makeAgentHistory({
					tools: {
						published_tool: {
							code: 'return "published";',
							descriptor: { ...customToolDescriptor, name: 'published_tool' },
						},
					},
				}),
			}),
		);
		skillHub.resolveDraftSkills.mockResolvedValue({
			draft_skill: {
				name: 'Draft skill',
				description: 'Draft description',
				instructions: 'Draft body',
			},
		});
		skillHub.resolvePinnedSkills.mockResolvedValue({
			published_skill: {
				name: 'Published skill',
				description: 'Published description',
				instructions: 'Published body',
			},
		});

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
		expect(skillHub.resolveDraftSkills).toHaveBeenCalledWith(runnableConfig);
		expect(skillHub.resolvePinnedSkills).not.toHaveBeenCalled();
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
