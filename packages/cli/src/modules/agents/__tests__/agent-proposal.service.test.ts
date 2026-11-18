import type {
	AgentConfigMutationResponse,
	AgentJsonConfig,
	AgentProposalEdit,
	AgentSkill,
	AgentSkillMutationResponse,
	SkillDetail,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ConflictError, ForbiddenError, LockedError, NotFoundError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentProposalApplyProgress } from '../agent-proposal.contracts';
import { AgentProposalService } from '../agent-proposal.service';
import { AgentHistory } from '../entities/agent-history.entity';
import { AgentPublishHistory } from '../entities/agent-publish-history.entity';
import { Agent, type ProjectAgent } from '../entities/agent.entity';
import { getAgentConfigHash, getAgentSkillHash } from '../utils/agent-config-hash';
import { createAgentSkillRefsService, storedAgentConfig } from './test-utils/stored-agent-config';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

type Dependencies = ConstructorParameters<typeof AgentProposalService>;

const user = mock<User>({ id: 'user-1' });
const node = { nodeType: 'n8n-nodes-base.httpRequestTool', nodeTypeVersion: 1, nodeParameters: {} };
const publishedConfig = {
	name: 'Support agent',
	model: 'openai/gpt-5',
	credential: 'cred-1',
	instructions: 'Help with support tickets.',
	tools: [
		{ type: 'node', name: 'Find Order', description: 'Finds an order.', node },
		{ type: 'workflow', workflow: 'Find customer' },
		{ type: 'node', name: 'Disabled Tool', enabled: false, node },
		{ type: 'custom', id: 'calculator' },
	],
	mcpServers: [{ name: 'crm', url: 'https://example.com/mcp', description: 'CRM server.' }],
	subAgents: { agents: [{ agentId: 'child-1' }, { agentId: 'child-2', enabled: false }] },
	skills: [
		{ type: 'skill', id: 'refunds' },
		{ type: 'skill', id: 'shared' },
	],
} as AgentJsonConfig;
const refunds: AgentSkill = {
	name: 'Refunds',
	description: 'Refund rules.',
	instructions: 'Refund in 14 days.',
};
const shared: AgentSkill = { name: 'Shared', description: 'Tone.', instructions: 'Be kind.' };

const instructionsEdit: AgentProposalEdit = {
	kind: 'instructions',
	before: 'Help with support tickets.',
	after: 'Help with orders.',
};
const skillEdit: AgentProposalEdit = {
	kind: 'skill',
	skillId: 'refunds',
	skillName: 'Refunds',
	field: 'instructions',
	before: 'Refund in 14 days.',
	after: 'Refund in 30 days.',
};
const noProgress: AgentProposalApplyProgress = { savedSkillIds: [], savedVersionId: null };

function setup() {
	const logger = mock<Dependencies[0]>();
	const agentRepository = mock<Dependencies[1]>();
	const agentSkillRepository = mock<Dependencies[2]>();
	const publishHistory = mock<Dependencies[3]>();
	const skillRefs = createAgentSkillRefsService({
		refunds: structuredClone(refunds),
		shared: structuredClone(shared),
	});
	const configService = mock<Dependencies[5]>();
	const agentSkills = mock<Dependencies[6]>();
	const publishService = mock<Dependencies[7]>();
	const writeLock = mock<Dependencies[8]>();
	const skillService = mock<Dependencies[9]>();
	const skillUsage = mock<Dependencies[10]>();
	const skillAccess = mock<Dependencies[11]>();
	const agentHistory = mock<Dependencies[12]>();

	const version = Object.assign(new AgentHistory(), {
		versionId: 'version-1',
		agentId: 'agent-1',
		schema: storedAgentConfig(structuredClone(publishedConfig)),
		tools: { calculator: { code: '', descriptor: { name: 'calculate', description: 'Adds.' } } },
		createdAt: new Date('2026-01-01T00:00:00Z'),
	});
	const agent: ProjectAgent = Object.assign(new Agent(), {
		id: 'agent-1',
		projectId: 'proj-1',
		name: 'Support agent',
		schema: storedAgentConfig(structuredClone(publishedConfig)),
		tools: {},
		integrations: [],
		isArchived: false,
		versionId: 'version-1',
		activeVersionId: 'version-1',
		activeVersion: version,
		revision: 7,
	});

	agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
	agentRepository.findSummariesByIds.mockResolvedValue([
		{ id: 'child-1', name: 'Billing agent', projectId: 'proj-1' },
	]);
	publishHistory.findLatestForVersions.mockResolvedValue(new Map());
	skillUsage.findUsingAgentIds.mockImplementation(async (skillId) =>
		skillId === 'shared' ? ['agent-1', 'agent-2'] : ['agent-1'],
	);
	skillService.get.mockResolvedValue(
		mock<SkillDetail>({
			syncedFrom: null,
			availableToAssistant: false,
			availableToMCP: false,
			canEdit: true,
		}),
	);
	configService.validateConfig.mockImplementation(async (raw) => ({
		valid: true,
		config: raw as AgentJsonConfig,
	}));
	configService.getConfig.mockResolvedValue(structuredClone(publishedConfig));
	configService.updateConfig.mockResolvedValue(
		mock<AgentConfigMutationResponse>({ versionId: 'version-2' }),
	);
	agentSkills.updateSkill.mockResolvedValue(
		mock<AgentSkillMutationResponse>({ versionId: 'version-1' }),
	);
	agentSkillRepository.findPins.mockResolvedValue([
		{ skillId: 'refunds', skillVersionId: 'refunds-latest' },
		{ skillId: 'shared', skillVersionId: 'shared-latest' },
	]);
	publishService.publishAgent.mockResolvedValue({
		agent: Object.assign(new Agent(), agent, { activeVersionId: 'version-2' }),
	});

	return {
		service: new AgentProposalService(
			logger,
			agentRepository,
			agentSkillRepository,
			publishHistory,
			skillRefs,
			configService,
			agentSkills,
			publishService,
			writeLock,
			skillService,
			skillUsage,
			skillAccess,
			agentHistory,
		),
		agentHistory,
		logger,
		agentRepository,
		agentSkillRepository,
		publishHistory,
		skillRefs,
		configService,
		agentSkills,
		publishService,
		writeLock,
		skillService,
		skillUsage,
		skillAccess,
		agent,
		version,
	};
}

describe('AgentProposalService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	describe('readBase', () => {
		it('returns not_found when the user cannot read agents', async () => {
			const { service, agentRepository } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(false);

			expect(await service.readBase(user, 'proj-1', 'agent-1')).toEqual({
				unavailable: 'not_found',
			});
			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: 'proj-1',
			});
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it.each(['not_found', 'archived', 'not_published', 'unpublished_changes'] as const)(
			'returns the reason when the agent is not available: %s',
			async (reason) => {
				const { service, agentRepository, agent } = setup();
				if (reason === 'not_found') agentRepository.findByIdAndProjectId.mockResolvedValue(null);
				if (reason === 'archived') agent.isArchived = true;
				if (reason === 'not_published') {
					agent.activeVersionId = null;
					agent.activeVersion = null;
				}
				if (reason === 'unpublished_changes') agent.versionId = 'version-draft';

				expect(await service.readBase(user, 'proj-1', 'agent-1')).toEqual({ unavailable: reason });
			},
		);

		it('returns unpublished_changes when the draft follows a newer skill version', async () => {
			const { service, skillRefs } = setup();
			skillRefs.matchesVersion.mockResolvedValue(false);

			expect(await service.readBase(user, 'proj-1', 'agent-1')).toEqual({
				unavailable: 'unpublished_changes',
			});
		});

		it('returns the published content and not the draft', async () => {
			const { service, agent, publishHistory } = setup();
			agent.schema = storedAgentConfig({ ...publishedConfig, instructions: 'Draft text.' });
			// The clean test compares version IDs, so this draft still counts as clean.
			publishHistory.findLatestForVersions.mockResolvedValue(
				new Map([
					[
						'version-1',
						Object.assign(new AgentPublishHistory(), {
							createdAt: new Date('2026-02-02T00:00:00Z'),
						}),
					],
				]),
			);

			const result = await service.readBase(user, 'proj-1', 'agent-1');

			expect(result).toEqual({
				base: {
					agentId: 'agent-1',
					agentName: 'Support agent',
					versionId: 'version-1',
					publishedAt: new Date('2026-02-02T00:00:00Z'),
					model: 'openai/gpt-5',
					instructions: 'Help with support tickets.',
					tools: [
						{ type: 'node', name: 'Find_Order', description: 'Finds an order.', editable: true },
						{ type: 'workflow', name: 'find-customer', description: null, editable: true },
						{ type: 'custom', name: 'calculate', description: 'Adds.', editable: false },
						{ type: 'mcp', name: 'crm', description: 'CRM server.', editable: false },
					],
					skills: [
						{ id: 'refunds', ...refunds, editable: true },
						{
							id: 'shared',
							...shared,
							editable: false,
							notEditableReason: 'Other agents use this skill.',
						},
					],
					subAgents: ['Billing agent'],
				},
			});
		});

		it('uses the version time when no publication record exists', async () => {
			const { service, version } = setup();
			version.schema = storedAgentConfig({ ...publishedConfig, model: '' });

			const result = await service.readBase(user, 'proj-1', 'agent-1');

			expect(result).toMatchObject({ base: { publishedAt: version.createdAt, model: null } });
		});

		it.each([
			['a pin to an older version', 'The agent uses an older version of this skill.'],
			['a synced skill', 'The skill is synced from a source.'],
			['a skill of n8n Assistant', 'The skill is available to n8n Assistant or MCP.'],
			['a skill without edit access', 'The user cannot edit this skill.'],
			['a skill without read access', 'The user has no access to this skill.'],
		])('does not let a proposal edit %s', async (kind, reason) => {
			const { service, skillRefs, skillService } = setup();
			if (kind === 'a pin to an older version') {
				skillRefs.findOutdatedSkillIds.mockResolvedValue(['refunds']);
			}
			const detail = {
				syncedFrom:
					kind === 'a synced skill' ? mock<NonNullable<SkillDetail['syncedFrom']>>() : null,
				availableToAssistant: kind === 'a skill of n8n Assistant',
				availableToMCP: false,
				canEdit: kind !== 'a skill without edit access',
			};
			skillService.get.mockResolvedValue(mock<SkillDetail>(detail));
			if (kind === 'a skill without read access') {
				skillService.get.mockRejectedValue(new NotFoundError('Skill not found'));
			}

			const result = await service.readBase(user, 'proj-1', 'agent-1');

			expect(result).toMatchObject({
				base: { skills: [{ id: 'refunds', editable: false, notEditableReason: reason }, {}] },
			});
		});
	});

	describe('normalizeEdits', () => {
		it('fills the values of the published version', async () => {
			const { service } = setup();

			const result = await service.normalizeEdits(user, 'proj-1', 'agent-1', 'version-1', [
				{ kind: 'instructions', after: 'Help with orders.' },
				{ kind: 'toolDescription', toolType: 'node', toolName: 'Find_Order', after: 'By ID.' },
				{
					kind: 'toolDescription',
					toolType: 'workflow',
					toolName: 'find-customer',
					after: 'Finds a customer.',
				},
				{ kind: 'skill', skillId: 'refunds', field: 'instructions', after: 'Refund in 30 days.' },
			]);

			expect(result).toEqual({
				edits: [
					instructionsEdit,
					{
						kind: 'toolDescription',
						toolType: 'node',
						toolName: 'Find_Order',
						before: 'Finds an order.',
						after: 'By ID.',
					},
					{
						kind: 'toolDescription',
						toolType: 'workflow',
						toolName: 'find-customer',
						before: null,
						after: 'Finds a customer.',
					},
					skillEdit,
				],
			});
		});

		it('returns all errors of the edit list', async () => {
			const { service, configService } = setup();

			const result = await service.normalizeEdits(user, 'proj-1', 'agent-1', 'version-1', [
				{ kind: 'toolDescription', toolType: 'mcp', toolName: 'crm', after: 'New.' },
				{ kind: 'toolDescription', toolType: 'node', toolName: 'calculate', after: 'New.' },
				{ kind: 'toolDescription', toolType: 'node', toolName: 'Disabled_Tool', after: 'New.' },
				{ kind: 'instructions', after: 'Help with support tickets.' },
				{ kind: 'instructions', after: 'Another text.' },
				{ kind: 'skill', skillId: 'shared', field: 'description', after: 'New.' },
				{ kind: 'skill', skillId: 'missing', field: 'description', after: 'New.' },
			]);

			expect(result).toEqual({
				errors: [
					'The description of an MCP server is not sent to the model. It cannot be edited.',
					'"calculate" is a custom tool. The description of a custom tool cannot be edited.',
					'The agent has no node tool with the name "Disabled_Tool".',
					'The edit does not change the instructions.',
					'More than one edit changes the instructions.',
					'The skill "Shared" cannot be edited. Other agents use this skill.',
					'The agent has no skill with the ID "missing".',
				],
			});
			expect(configService.validateConfig).not.toHaveBeenCalled();
		});

		it('rejects a tool name that more than one tool has', async () => {
			const { service, version } = setup();
			version.schema = storedAgentConfig({
				...publishedConfig,
				tools: [
					{ type: 'node', name: 'Find Order', node },
					{ type: 'node', name: 'Find_Order', node },
				],
			});

			const result = await service.normalizeEdits(user, 'proj-1', 'agent-1', 'version-1', [
				{ kind: 'toolDescription', toolType: 'node', toolName: 'Find_Order', after: 'New.' },
			]);

			expect(result).toEqual({
				errors: ['The agent has more than one node tool with the name "Find_Order".'],
			});
		});

		it('rejects edits when the published version changed', async () => {
			const { service } = setup();

			const result = await service.normalizeEdits(user, 'proj-1', 'agent-1', 'version-0', [
				{ kind: 'instructions', after: 'Help with orders.' },
			]);

			expect(result).toEqual({ errors: ['The published version of the agent changed.'] });
		});

		it('rejects edits when the agent is not available', async () => {
			const { service, agent } = setup();
			agent.isArchived = true;

			const result = await service.normalizeEdits(user, 'proj-1', 'agent-1', 'version-1', []);

			expect(result).toEqual({ errors: ['The agent cannot be edited (archived).'] });
		});

		it('validates the edited configuration and the edited skills', async () => {
			const { service, configService } = setup();
			configService.validateConfig.mockResolvedValue({
				valid: false,
				error: 'Config is not valid.',
			});

			const result = await service.normalizeEdits(user, 'proj-1', 'agent-1', 'version-1', [
				{ kind: 'instructions', after: 'Help with orders.' },
				{ kind: 'skill', skillId: 'refunds', field: 'description', after: 'x'.repeat(2000) },
			]);

			expect(configService.validateConfig).toHaveBeenCalledWith(
				expect.objectContaining({ instructions: 'Help with orders.' }),
			);
			expect(result).toEqual({
				errors: [
					'Config is not valid.',
					'The skill "refunds" is not valid: Description must be 1024 characters or fewer',
				],
			});
		});

		it('accepts an empty edit list', async () => {
			const { service } = setup();

			expect(await service.normalizeEdits(user, 'proj-1', 'agent-1', 'version-1', [])).toEqual({
				edits: [],
			});
		});
	});

	describe('checkApplicable', () => {
		it.each(['ok', 'outdated', 'unpublished_changes', 'archived', 'not_found'] as const)(
			'returns %s',
			async (expected) => {
				const { service, agent } = setup();
				if (expected === 'outdated') agent.activeVersionId = 'version-9';
				if (expected === 'unpublished_changes') agent.versionId = 'version-draft';
				if (expected === 'archived') agent.isArchived = true;
				if (expected === 'not_found') vi.mocked(userHasScopes).mockResolvedValue(false);

				expect(await service.checkApplicable(user, 'proj-1', 'agent-1', 'version-1')).toBe(
					expected,
				);
			},
		);
	});

	describe('apply', () => {
		const input = (edits: AgentProposalEdit[], progress = noProgress) => ({
			projectId: 'proj-1',
			agentId: 'agent-1',
			baseVersionId: 'version-1',
			edits,
			progress,
		});

		it('saves the edits on the draft and publishes the saved version', async () => {
			const { service, configService, agentSkills, publishService, skillAccess } = setup();

			const result = await service.apply(user, input([instructionsEdit, skillEdit]));

			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:update', 'agent:publish'], false, {
				projectId: 'proj-1',
			});
			expect(skillAccess.assertCanEdit).toHaveBeenCalledWith(user, ['refunds']);
			expect(agentSkills.updateSkill).toHaveBeenCalledWith(
				'agent-1',
				'proj-1',
				'refunds',
				{ instructions: 'Refund in 30 days.' },
				{ user, modifiedBy: 'builder' },
				getAgentSkillHash(refunds),
			);
			expect(configService.updateConfig).toHaveBeenCalledWith(
				'agent-1',
				'proj-1',
				{ ...publishedConfig, instructions: 'Help with orders.' },
				user,
				{ baseConfigHash: getAgentConfigHash(publishedConfig), modifiedBy: 'builder' },
			);
			expect(publishService.publishAgent).toHaveBeenCalledWith(
				'agent-1',
				'proj-1',
				user,
				{ by: 'builder', trigger: 'explicit' },
				'version-2',
			);
			expect(agentSkills.updateSkill.mock.invocationCallOrder[0]).toBeLessThan(
				configService.updateConfig.mock.invocationCallOrder[0],
			);
			expect(result).toEqual({
				status: 'published',
				publishedVersionId: 'version-2',
				progress: { savedSkillIds: ['refunds'], savedVersionId: 'version-2' },
			});
		});

		it('publishes the draft when only skills changed', async () => {
			const { service, configService, publishService } = setup();

			const result = await service.apply(user, input([skillEdit]));

			expect(configService.updateConfig).not.toHaveBeenCalled();
			expect(publishService.publishAgent).toHaveBeenCalledWith(
				'agent-1',
				'proj-1',
				user,
				{ by: 'builder', trigger: 'explicit' },
				undefined,
				undefined,
				7,
			);
			expect(result).toEqual({
				status: 'published',
				publishedVersionId: 'version-2',
				progress: { savedSkillIds: ['refunds'], savedVersionId: null },
			});
		});

		it('does not report a publish that published no new version', async () => {
			const { service, publishService, agent } = setup();
			publishService.publishAgent.mockResolvedValue({ agent });

			const result = await service.apply(user, input([skillEdit]));

			expect(result).toMatchObject({ status: 'failed', retryable: false });
		});

		it('writes nothing when the user cannot update and publish the agent', async () => {
			const { service, agentSkills, configService, publishService } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(false);

			const result = await service.apply(user, input([instructionsEdit, skillEdit]));

			expect(result).toMatchObject({ status: 'failed', retryable: false, progress: noProgress });
			expect(agentSkills.updateSkill).not.toHaveBeenCalled();
			expect(configService.updateConfig).not.toHaveBeenCalled();
			expect(publishService.publishAgent).not.toHaveBeenCalled();
		});

		it('writes nothing when the user cannot edit a skill', async () => {
			const { service, skillAccess, agentSkills } = setup();
			skillAccess.assertCanEdit.mockRejectedValue(new ForbiddenError('No skill access.'));

			const result = await service.apply(user, input([skillEdit]));

			expect(result).toEqual({
				status: 'failed',
				retryable: false,
				error: 'No skill access.',
				progress: noProgress,
			});
			expect(agentSkills.updateSkill).not.toHaveBeenCalled();
		});

		it('writes nothing when another agent started to use a skill after the test', async () => {
			const { service, skillUsage, agentSkills, publishService } = setup();
			skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			const result = await service.apply(user, input([skillEdit]));

			expect(result).toEqual({
				status: 'failed',
				retryable: false,
				error: 'The skill "refunds" cannot be edited. Other agents use this skill.',
				progress: noProgress,
			});
			expect(agentSkills.updateSkill).not.toHaveBeenCalled();
			expect(publishService.publishAgent).not.toHaveBeenCalled();
		});

		it('publishes the new draft version after the save of a pinned skill', async () => {
			const { service, skillRefs, agentSkills, agentRepository, agent, publishService } = setup();
			skillRefs.draftRefs.set('agent-1', [
				{ type: 'skill', id: 'refunds', versionId: 'refunds-latest' },
				{ type: 'skill', id: 'shared' },
			]);
			agentSkills.updateSkill.mockResolvedValue(
				mock<AgentSkillMutationResponse>({ versionId: 'version-1b' }),
			);
			agentRepository.findByIdAndProjectId
				.mockResolvedValueOnce(agent)
				.mockResolvedValueOnce(
					Object.assign(new Agent(), agent, { versionId: 'version-1b', revision: 8 }),
				);

			const result = await service.apply(user, input([skillEdit]));

			expect(publishService.publishAgent).toHaveBeenCalledWith(
				'agent-1',
				'proj-1',
				user,
				{ by: 'builder', trigger: 'explicit' },
				undefined,
				undefined,
				8,
			);
			expect(result).toMatchObject({ status: 'published', publishedVersionId: 'version-2' });
		});

		it('does not publish a draft that changed after the skill saves', async () => {
			const { service, agentRepository, agent, publishService } = setup();
			agentRepository.findByIdAndProjectId
				.mockResolvedValueOnce(agent)
				.mockResolvedValueOnce(Object.assign(new Agent(), agent, { versionId: 'version-other' }));

			const result = await service.apply(user, input([skillEdit]));

			expect(result).toMatchObject({
				status: 'failed',
				retryable: true,
				progress: { savedSkillIds: ['refunds'], savedVersionId: null },
			});
			expect(publishService.publishAgent).not.toHaveBeenCalled();
		});

		it('returns a failure that a retry can correct when a user edits the agent', async () => {
			const { service, writeLock, agentRepository } = setup();
			writeLock.ensureAgentEditable.mockRejectedValue(new LockedError('Agent is locked.'));

			const result = await service.apply(user, input([instructionsEdit]));

			expect(result).toEqual({
				status: 'failed',
				retryable: true,
				error: 'Agent is locked.',
				progress: noProgress,
			});
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it.each([
			'a new published version',
			'a changed draft',
			'a newer skill version',
			'an archived agent',
		])('returns outdated and writes nothing for %s', async (kind) => {
			const { service, agent, skillRefs, configService, publishService } = setup();
			if (kind === 'a new published version') agent.activeVersionId = 'version-9';
			if (kind === 'a changed draft') agent.versionId = 'version-draft';
			if (kind === 'a newer skill version') skillRefs.matchesVersion.mockResolvedValue(false);
			if (kind === 'an archived agent') agent.isArchived = true;

			expect(await service.apply(user, input([instructionsEdit]))).toEqual({ status: 'outdated' });
			expect(configService.updateConfig).not.toHaveBeenCalled();
			expect(publishService.publishAgent).not.toHaveBeenCalled();
		});

		it('returns the progress when a step after a skill save fails', async () => {
			const { service, configService, publishService } = setup();
			configService.updateConfig.mockRejectedValue(new ConflictError('Config changed.'));

			const result = await service.apply(user, input([instructionsEdit, skillEdit]));

			expect(result).toEqual({
				status: 'failed',
				retryable: true,
				error: 'Config changed.',
				progress: { savedSkillIds: ['refunds'], savedVersionId: null },
			});
			expect(publishService.publishAgent).not.toHaveBeenCalled();
		});

		it('does not retry a save that the validation rejects', async () => {
			const { service, configService } = setup();
			configService.updateConfig.mockRejectedValue(new UserError('Config is not valid.'));

			const result = await service.apply(user, input([instructionsEdit]));

			expect(result).toMatchObject({
				status: 'failed',
				retryable: false,
				error: 'Config is not valid.',
			});
		});

		it('hides the message of an unknown error and keeps the progress', async () => {
			const { service, configService, logger } = setup();
			configService.updateConfig.mockRejectedValue(new Error('connection lost: secret'));

			const result = await service.apply(user, input([instructionsEdit, skillEdit]));

			expect(result).toEqual({
				status: 'failed',
				retryable: true,
				error: 'The agent change was not applied because of an internal error.',
				progress: { savedSkillIds: ['refunds'], savedVersionId: null },
			});
			expect(logger.error).toHaveBeenCalled();
		});

		describe('with saved skills from an earlier call', () => {
			const progress: AgentProposalApplyProgress = {
				savedSkillIds: ['refunds'],
				savedVersionId: null,
			};

			it('does the remaining steps although the draft follows the new skill version', async () => {
				const { service, skillRefs, agentSkills, configService, skillAccess } = setup();
				// The saved skill has a new version. The full clean test would fail.
				skillRefs.matchesVersion.mockResolvedValue(false);
				skillRefs.versionSnapshot.mockResolvedValue(
					new Map([
						['refunds', 'refunds-v2'],
						['shared', 'shared-latest'],
					]),
				);

				const result = await service.apply(user, input([instructionsEdit, skillEdit], progress));

				expect(skillAccess.assertCanEdit).not.toHaveBeenCalled();
				expect(agentSkills.updateSkill).not.toHaveBeenCalled();
				expect(configService.updateConfig).toHaveBeenCalled();
				expect(result).toEqual({
					status: 'published',
					publishedVersionId: 'version-2',
					progress: { savedSkillIds: ['refunds'], savedVersionId: 'version-2' },
				});
			});

			it('continues when the save of a pinned skill gave the draft a new version ID', async () => {
				const { service, skillRefs, agent, version, agentHistory, configService } = setup();
				skillRefs.versionSnapshot.mockResolvedValue(
					new Map([
						['refunds', 'refunds-v2'],
						['shared', 'shared-latest'],
					]),
				);
				agent.versionId = 'version-1b';
				agentHistory.findByVersionAndAgentId.mockResolvedValue(
					Object.assign(new AgentHistory(), {
						versionId: 'version-1b',
						agentId: 'agent-1',
						schema: structuredClone(version.schema),
						tools: structuredClone(version.tools),
					}),
				);

				const result = await service.apply(user, input([instructionsEdit, skillEdit], progress));

				expect(agentHistory.findByVersionAndAgentId).toHaveBeenCalledWith(
					'version-1b',
					'agent-1',
					{},
				);
				expect(configService.updateConfig).toHaveBeenCalled();
				expect(result).toMatchObject({ status: 'published', publishedVersionId: 'version-2' });
			});

			it('returns outdated when the new draft version has other content', async () => {
				const { service, skillRefs, agent, version, agentHistory, publishService } = setup();
				skillRefs.versionSnapshot.mockResolvedValue(
					new Map([
						['refunds', 'refunds-v2'],
						['shared', 'shared-latest'],
					]),
				);
				agent.versionId = 'version-1b';
				agentHistory.findByVersionAndAgentId.mockResolvedValue(
					Object.assign(new AgentHistory(), {
						versionId: 'version-1b',
						agentId: 'agent-1',
						schema: { ...structuredClone(version.schema), instructions: 'Changed by a user.' },
						tools: structuredClone(version.tools),
					}),
				);

				const result = await service.apply(user, input([instructionsEdit, skillEdit], progress));

				expect(result).toEqual({ status: 'outdated' });
				expect(publishService.publishAgent).not.toHaveBeenCalled();
			});

			it.each([
				'another skill has a new version',
				'the draft config changed',
				'a skill was removed',
			])('returns outdated when %s', async (kind) => {
				const { service, skillRefs, agent, agentHistory, publishService } = setup();
				const snapshot = new Map([
					['refunds', 'refunds-v2'],
					['shared', kind === 'another skill has a new version' ? 'shared-v2' : 'shared-latest'],
				]);
				if (kind === 'a skill was removed') snapshot.delete('refunds');
				skillRefs.versionSnapshot.mockResolvedValue(snapshot);
				if (kind === 'the draft config changed') {
					agent.versionId = 'version-draft';
					agentHistory.findByVersionAndAgentId.mockResolvedValue(null);
				}

				const result = await service.apply(user, input([instructionsEdit, skillEdit], progress));

				expect(result).toEqual({ status: 'outdated' });
				expect(publishService.publishAgent).not.toHaveBeenCalled();
			});
		});

		describe('with a saved version from an earlier call', () => {
			const progress: AgentProposalApplyProgress = {
				savedSkillIds: ['refunds'],
				savedVersionId: 'version-2',
			};

			it('publishes the saved version without a new save', async () => {
				const { service, agent, skillRefs, agentSkills, configService, publishService } = setup();
				// The saved version made the draft differ from the published version.
				agent.versionId = 'version-2';
				skillRefs.matchesVersion.mockResolvedValue(false);

				const result = await service.apply(user, input([instructionsEdit, skillEdit], progress));

				expect(agentSkills.updateSkill).not.toHaveBeenCalled();
				expect(configService.updateConfig).not.toHaveBeenCalled();
				expect(publishService.publishAgent).toHaveBeenCalledWith(
					'agent-1',
					'proj-1',
					user,
					{ by: 'builder', trigger: 'explicit' },
					'version-2',
				);
				expect(result).toEqual({ status: 'published', publishedVersionId: 'version-2', progress });
			});

			it('returns published when the saved version is the published version', async () => {
				const { service, agent, publishService } = setup();
				agent.activeVersionId = 'version-2';

				const result = await service.apply(user, input([instructionsEdit, skillEdit], progress));

				expect(result).toEqual({ status: 'published', publishedVersionId: 'version-2', progress });
				expect(publishService.publishAgent).not.toHaveBeenCalled();
			});

			it('returns outdated when a different version is published', async () => {
				const { service, agent, publishService } = setup();
				agent.activeVersionId = 'version-9';

				const result = await service.apply(user, input([instructionsEdit, skillEdit], progress));

				expect(result).toEqual({ status: 'outdated' });
				expect(publishService.publishAgent).not.toHaveBeenCalled();
			});
		});
	});
});
