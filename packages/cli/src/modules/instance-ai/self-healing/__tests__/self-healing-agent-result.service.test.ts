import type {
	AgentProposalEdit,
	AgentProposalEvalCase,
	SelfHealingAgentApplyProgress,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { RoleService } from '@n8n/backend-services';
import { Person, type TransactionRunner, type User, type UserRepository } from '@n8n/db';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentProposalService } from '@/modules/agents/agent-proposal.service';
import type { AgentEvalProposalService } from '@/modules/agent-evals/agent-eval-proposal.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { SelfHealingAgentInvestigation } from '../agents/database/self-healing-agent-investigation.entity';
import type { SelfHealingAgentInvestigationRepository } from '../agents/database/self-healing-agent-investigation.repository';
import type { SelfHealingAgentResult } from '../agents/database/self-healing-agent-result.entity';
import type { SelfHealingAgentResultRepository } from '../agents/database/self-healing-agent-result.repository';
import { getAgentEvalProposals, getAgentServices } from '../agents/self-healing-agent-modules';
import {
	SELF_HEALING_AGENT_APPLY_LEASE_MS,
	SelfHealingAgentResultService,
	type CompleteSelfHealingAgentResult,
} from '../agents/self-healing-agent-result.service';
import type { SelfHealingConfiguration } from '../database/self-healing-configuration.entity';
import type { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import type { SelfHealingConfigurationService } from '../self-healing-configuration.service';

vi.mock('../agents/self-healing-agent-modules', () => ({
	getAgentServices: vi.fn(),
	getAgentEvalProposals: vi.fn(),
}));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

// Plain objects, not `mock()` proxies: a deep comparison of a proxy adds mock
// properties to it, and each test then compares a larger object.
const reviewer = Object.assign(new Person(), {
	id: 'reviewer',
	firstName: 'Ria',
	lastName: 'Reviewer',
});
const actor = { id: 'actor', disabled: false } as unknown as User;
const projectId = 'project';
const agentId = 'agent';
const now = new Date('2026-06-01T12:00:00.000Z');
const usage = { credits: 2, turns: 3, durationSeconds: 10 };
const emptyProgress: SelfHealingAgentApplyProgress = {
	evalsApplied: false,
	savedSkillIds: [],
	savedVersionId: null,
	agentPublished: false,
};
const edit: AgentProposalEdit = { kind: 'instructions', before: 'Old.', after: 'New.' };
const evalCase: AgentProposalEvalCase = {
	caseKey: 'new:0',
	change: 'added',
	caseId: null,
	before: null,
	motivating: true,
	input: 'Where is my order?',
	criteria: 'The answer has the order status.',
	expectedTools: ['order_lookup'],
};
const evidence = { ranAt: now.toISOString(), cases: [] };

describe('SelfHealingAgentResultService', () => {
	const results = mock<SelfHealingAgentResultRepository>();
	const investigations = mock<SelfHealingAgentInvestigationRepository>();
	const configurations = mock<SelfHealingConfigurationRepository>();
	const configurationService = mock<SelfHealingConfigurationService>();
	const users = mock<UserRepository>();
	const roles = mock<RoleService>();
	const txRunner = mock<TransactionRunner>();
	const logger = mock<Logger>();
	const proposals = mock<AgentProposalService>();
	const context = mock<AgentContextService>();
	const evals = mock<AgentEvalProposalService>();
	const service = new SelfHealingAgentResultService(
		results,
		investigations,
		configurations,
		configurationService,
		users,
		roles,
		txRunner,
		logger,
	);
	let result: SelfHealingAgentResult;

	function makeResult(change: Partial<SelfHealingAgentResult> = {}) {
		return {
			id: 'result',
			configurationId: 1,
			projectId,
			agentId,
			agentName: 'Support agent',
			baseVersionId: 'version',
			goals: ['quality'],
			trigger: 'traces',
			traceWindowStart: null,
			traceWindowEnd: now,
			traceCount: 7,
			summary: 'Fix the lookup tool',
			report: 'Report.',
			edits: [edit],
			evalCases: [evalCase],
			evidence,
			usage,
			reviewState: 'open',
			appliedAutomatically: false,
			publishedVersionId: null,
			applyProgress: emptyProgress,
			applyError: null,
			closedAt: null,
			closedById: null,
			createdAt: now,
			updatedAt: now,
			...change,
		} as SelfHealingAgentResult;
	}

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers({ now });
		result = makeResult();
		vi.mocked(getAgentServices).mockResolvedValue({ proposals, context });
		vi.mocked(getAgentEvalProposals).mockResolvedValue(evals);
		vi.mocked(userHasScopes).mockResolvedValue(true);
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		results.getResult.mockImplementation(async () => result);
		results.claimApply.mockResolvedValue(true);
		results.saveApplyProgress.mockResolvedValue(true);
		results.close.mockResolvedValue(true);
		configurations.isReviewer.mockResolvedValue(true);
		users.findByIdWithRole.mockResolvedValue(reviewer);
		proposals.checkApplicable.mockResolvedValue('ok');
		proposals.apply.mockResolvedValue({
			status: 'published',
			publishedVersionId: 'new-version',
			progress: { savedSkillIds: [], savedVersionId: 'new-version' },
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getDetail', () => {
		it('returns the proposal with the trace window and the closing user', async () => {
			result = makeResult({ reviewState: 'applied', closedAt: now, closedById: reviewer.id });
			context.getVersionPublishedAt.mockResolvedValue(now);

			const detail = await service.getDetail(reviewer, projectId, 'result');

			expect(context.getVersionPublishedAt).toHaveBeenCalledWith(
				result.agentId,
				result.baseVersionId,
			);
			expect(detail).toMatchObject({
				resultId: 'result',
				baseVersionPublishedAt: now.toISOString(),
				agentName: 'Support agent',
				traceWindow: { start: null, end: now.toISOString(), count: 7 },
				reviewState: 'applied',
				closedAt: now.toISOString(),
				closedBy: { id: 'reviewer', firstName: 'Ria', lastName: 'Reviewer' },
				edits: [edit],
				evalCases: [evalCase],
			});
		});

		it('hides the proposal from a user without agent edit access', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);
			await expect(service.getDetail(reviewer, projectId, 'result')).rejects.toThrow(NotFoundError);
			expect(results.getResult).not.toHaveBeenCalled();
		});

		it('hides the proposal from a user who is not a reviewer', async () => {
			configurations.isReviewer.mockResolvedValue(false);
			await expect(service.getDetail(reviewer, projectId, 'result')).rejects.toThrow(NotFoundError);
		});
	});

	describe('apply', () => {
		it('applies the eval cases, publishes the edits and closes the proposal', async () => {
			await service.apply(reviewer, projectId, 'result');

			expect(results.claimApply).toHaveBeenCalledWith(
				'result',
				new Date(now.getTime() - SELF_HEALING_AGENT_APPLY_LEASE_MS),
			);
			expect(evals.applyCases).toHaveBeenCalledWith(reviewer, {
				projectId,
				agentId,
				cases: [evalCase],
			});
			expect(results.saveApplyProgress).toHaveBeenCalledWith('result', {
				applyProgress: { ...emptyProgress, evalsApplied: true },
				applyError: null,
				releaseClaim: false,
			});
			expect(proposals.apply).toHaveBeenCalledWith(reviewer, {
				projectId,
				agentId,
				baseVersionId: 'version',
				edits: [edit],
				progress: { savedSkillIds: [], savedVersionId: null },
			});
			expect(results.close).toHaveBeenCalledWith('result', 'applied', {
				closedById: reviewer.id,
				appliedAutomatically: false,
				publishedVersionId: 'new-version',
				applyProgress: {
					evalsApplied: true,
					savedSkillIds: [],
					savedVersionId: 'new-version',
					agentPublished: true,
				},
			});
			expect(evals.applyCases.mock.invocationCallOrder[0]).toBeLessThan(
				proposals.apply.mock.invocationCallOrder[0],
			);
		});

		it('needs publish access for a proposal with agent edits', async () => {
			vi.mocked(userHasScopes).mockImplementation(
				async (_user, scopes) => !scopes.includes('agent:publish'),
			);

			await expect(service.apply(reviewer, projectId, 'result')).rejects.toThrow(ForbiddenError);
			expect(results.claimApply).not.toHaveBeenCalled();
		});

		it('applies an eval-only proposal without publish access and without an agent write', async () => {
			result = makeResult({ edits: [] });
			vi.mocked(userHasScopes).mockImplementation(
				async (_user, scopes) => !scopes.includes('agent:publish'),
			);

			await service.apply(reviewer, projectId, 'result');

			expect(proposals.checkApplicable).not.toHaveBeenCalled();
			expect(proposals.apply).not.toHaveBeenCalled();
			expect(results.close).toHaveBeenCalledWith(
				'result',
				'applied',
				expect.objectContaining({ publishedVersionId: null }),
			);
		});

		it('rejects an apply while another apply holds the claim', async () => {
			results.claimApply.mockResolvedValue(false);

			await expect(service.apply(reviewer, projectId, 'result')).rejects.toThrow(
				'This proposal is being applied.',
			);
			expect(evals.applyCases).not.toHaveBeenCalled();
		});

		it('rejects an apply of a closed proposal', async () => {
			result = makeResult({ reviewState: 'dismissed' });

			await expect(service.apply(reviewer, projectId, 'result')).rejects.toThrow(ConflictError);
			expect(results.claimApply).not.toHaveBeenCalled();
		});

		it.each(['outdated', 'unpublished_changes', 'not_published', 'archived', 'not_found'] as const)(
			'closes the proposal as outdated and applies nothing when the agent check returns %s',
			async (applicable) => {
				proposals.checkApplicable.mockResolvedValue(applicable);

				await service.apply(reviewer, projectId, 'result');

				expect(results.close).toHaveBeenCalledWith('result', 'outdated', {
					closedById: null,
					applyProgress: emptyProgress,
				});
				expect(evals.applyCases).not.toHaveBeenCalled();
				expect(proposals.apply).not.toHaveBeenCalled();
			},
		);

		it('keeps the proposal open and stores the error when the eval step fails', async () => {
			evals.applyCases.mockRejectedValue(new UserError('The data table is full.'));

			await service.apply(reviewer, projectId, 'result');

			expect(results.saveApplyProgress).toHaveBeenCalledWith('result', {
				applyProgress: emptyProgress,
				applyError: 'The data table is full.',
				releaseClaim: true,
			});
			expect(proposals.apply).not.toHaveBeenCalled();
			expect(results.close).not.toHaveBeenCalled();
		});

		it('does not store the text of an internal error', async () => {
			evals.applyCases.mockRejectedValue(new Error('connection string postgres://secret'));

			await service.apply(reviewer, projectId, 'result');

			expect(results.saveApplyProgress).toHaveBeenCalledWith(
				'result',
				expect.objectContaining({
					applyError: 'The proposal was not applied because of an internal error.',
					releaseClaim: true,
				}),
			);
		});

		it.each([true, false])(
			'stores the progress when the agent step fails with retryable %s',
			async (retryable) => {
				proposals.apply.mockResolvedValue({
					status: 'failed',
					retryable,
					error: 'The agent is locked.',
					progress: { savedSkillIds: ['skill'], savedVersionId: null },
				});

				await service.apply(reviewer, projectId, 'result');

				expect(results.saveApplyProgress).toHaveBeenLastCalledWith('result', {
					applyProgress: {
						evalsApplied: true,
						savedSkillIds: ['skill'],
						savedVersionId: null,
						agentPublished: false,
					},
					applyError: 'The agent is locked.',
					releaseClaim: true,
				});
				expect(results.close).not.toHaveBeenCalled();
			},
		);

		it('does only the remaining step in a retry', async () => {
			result = makeResult({
				applyProgress: { ...emptyProgress, evalsApplied: true, savedSkillIds: ['skill'] },
			});

			await service.apply(reviewer, projectId, 'result');

			expect(evals.applyCases).not.toHaveBeenCalled();
			// The earlier apply changed the draft, so the clean check is not repeated here.
			expect(proposals.checkApplicable).not.toHaveBeenCalled();
			expect(proposals.apply).toHaveBeenCalledWith(
				reviewer,
				expect.objectContaining({ progress: { savedSkillIds: ['skill'], savedVersionId: null } }),
			);
			expect(results.close).toHaveBeenCalledWith('result', 'applied', expect.anything());
		});

		it('closes the proposal as outdated when the agent step finds newer work', async () => {
			proposals.apply.mockResolvedValue({ status: 'outdated' });

			await service.apply(reviewer, projectId, 'result');

			expect(results.close).toHaveBeenCalledWith('result', 'outdated', {
				closedById: null,
				applyProgress: { ...emptyProgress, evalsApplied: true },
			});
		});

		it('accepts a published skill-only proposal that saved no agent version', async () => {
			proposals.apply.mockResolvedValue({
				status: 'published',
				publishedVersionId: 'new-version',
				progress: { savedSkillIds: ['skill'], savedVersionId: null },
			});

			await service.apply(reviewer, projectId, 'result');

			expect(results.close).toHaveBeenCalledWith(
				'result',
				'applied',
				expect.objectContaining({ publishedVersionId: 'new-version' }),
			);
		});

		it('stores an error when Agents are off', async () => {
			vi.mocked(getAgentServices).mockResolvedValue(null);

			await service.apply(reviewer, projectId, 'result');

			expect(results.saveApplyProgress).toHaveBeenCalledWith(
				'result',
				expect.objectContaining({ releaseClaim: true, applyError: expect.any(String) }),
			);
			expect(results.close).not.toHaveBeenCalled();
		});
	});

	describe('applyAutomatically', () => {
		it('applies without the reviewer rule and records no closing user', async () => {
			configurations.isReviewer.mockResolvedValue(false);

			await service.applyAutomatically(actor, result);

			expect(userHasScopes).toHaveBeenCalledWith(
				actor,
				['agent:read', 'agent:update', 'agent:publish'],
				false,
				{ projectId },
			);
			expect(configurations.isReviewer).not.toHaveBeenCalled();
			expect(results.close).toHaveBeenCalledWith(
				'result',
				'applied',
				expect.objectContaining({ closedById: null, appliedAutomatically: true }),
			);
		});

		it('leaves the proposal open when the actor cannot publish', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await service.applyAutomatically(actor, result);

			expect(results.claimApply).not.toHaveBeenCalled();
		});
	});

	describe('dismiss', () => {
		it('closes an open proposal as dismissed when no apply holds the claim', async () => {
			await service.dismiss(reviewer, projectId, 'result');

			expect(results.close).toHaveBeenCalledWith('result', 'dismissed', {
				closedById: reviewer.id,
				claimStaleBefore: new Date(now.getTime() - SELF_HEALING_AGENT_APPLY_LEASE_MS),
			});
		});

		it('rejects a dismiss while an apply is in progress', async () => {
			results.close.mockResolvedValue(false);
			await expect(service.dismiss(reviewer, projectId, 'result')).rejects.toThrow(
				'This proposal is being applied.',
			);
		});

		it('rejects a dismiss of a closed proposal', async () => {
			result = makeResult({ reviewState: 'applied' });
			await expect(service.dismiss(reviewer, projectId, 'result')).rejects.toThrow(
				'This proposal is already closed.',
			);
			expect(results.close).not.toHaveBeenCalled();
		});
	});

	describe('complete', () => {
		const configuration = mock<SelfHealingConfiguration>({ id: 1, agentPublicationMode: 'auto' });
		const input: CompleteSelfHealingAgentResult = {
			investigationId: 'investigation',
			agentName: 'Support agent',
			goals: ['quality', 'cost'],
			output: {
				outcome: 'proposal',
				summary: 'Fix the lookup tool',
				report: 'Report with the key sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789.',
			},
			lastTested: { edits: [edit], evalCases: [evalCase], evidence },
			usage,
		};
		let investigation: SelfHealingAgentInvestigation;

		beforeEach(() => {
			investigation = mock<SelfHealingAgentInvestigation>({
				id: 'investigation',
				configurationId: 1,
				projectId,
				agentId,
				backgroundUserId: actor.id,
				trigger: 'both',
				agentVersionId: 'version',
				traceWindowStart: null,
				traceWindowEnd: now,
				traceCount: 7,
				resultId: null,
				finishedAt: null,
			});
			investigations.findInvestigation.mockImplementation(async () => investigation);
			investigations.finish.mockResolvedValue(true);
			users.findByIdWithRole.mockResolvedValue(actor);
			configurations.findForUpdate.mockResolvedValue(configuration);
			configurationService.resolveAgentActorOrPause.mockResolvedValue(actor);
			results.createResult.mockResolvedValue(result);
		});

		it('saves the tested proposal and finishes the investigation in one transaction', async () => {
			const saved = await service.complete(input);

			expect(saved).toEqual({ result, actor, publicationMode: 'auto' });
			expect(results.createResult).toHaveBeenCalledWith(
				expect.objectContaining({
					configurationId: 1,
					projectId,
					agentId,
					agentName: 'Support agent',
					backgroundUserId: actor.id,
					baseVersionId: 'version',
					goals: ['quality', 'cost'],
					trigger: 'both',
					traceCount: 7,
					summary: 'Fix the lookup tool',
					edits: [edit],
					evalCases: [evalCase],
					evidence,
					usage,
				}),
				expect.anything(),
			);
			expect(investigations.completeWithResult).toHaveBeenCalledWith(
				'investigation',
				'result',
				usage,
				expect.anything(),
			);
		});

		it('removes secrets from the report', async () => {
			await service.complete(input);

			const [saved] = results.createResult.mock.calls[0];
			expect(saved.report).not.toContain('sk-ant-api03');
		});

		it('saves no proposal when the agent changed during the run', async () => {
			proposals.checkApplicable.mockResolvedValue('outdated');

			await expect(service.complete(input)).resolves.toBeNull();

			expect(investigations.finish).toHaveBeenCalledWith('investigation', {
				outcome: 'failed',
				failureReason: 'agent_changed',
				usage,
			});
			expect(results.createResult).not.toHaveBeenCalled();
		});

		it('does not check the agent for an eval-only proposal', async () => {
			await service.complete({ ...input, lastTested: { ...input.lastTested, edits: [] } });

			expect(proposals.checkApplicable).not.toHaveBeenCalled();
			expect(results.createResult).toHaveBeenCalled();
		});

		it('finishes without a proposal when the configuration was paused during the run', async () => {
			configurationService.resolveAgentActorOrPause.mockResolvedValue(null);

			await expect(service.complete(input)).resolves.toBeNull();

			expect(investigations.finish).toHaveBeenCalledWith(
				'investigation',
				{ outcome: 'failed', failureReason: 'configuration_paused', usage },
				expect.anything(),
			);
			expect(results.createResult).not.toHaveBeenCalled();
		});

		it('returns null when the configuration was deleted', async () => {
			configurations.findForUpdate.mockResolvedValue(null);
			await expect(service.complete(input)).resolves.toBeNull();
		});

		it('rejects a save when reconciliation finished the investigation first', async () => {
			investigations.findInvestigation
				.mockResolvedValueOnce(investigation)
				.mockResolvedValueOnce(
					mock<SelfHealingAgentInvestigation>({ resultId: null, finishedAt: now }),
				);

			await expect(service.complete(input)).rejects.toThrow(ConflictError);
			expect(results.createResult).not.toHaveBeenCalled();
		});

		it('stops before the commit when the run is aborted', async () => {
			const controller = new AbortController();
			investigations.completeWithResult.mockImplementation(async () => controller.abort());

			await expect(service.complete({ ...input, signal: controller.signal })).rejects.toThrow();
		});
	});

	describe('Inbox', () => {
		beforeEach(() => {
			roles.rolesWithScope.mockResolvedValue(['project:editor']);
			users.findByIdWithRole.mockResolvedValue(
				mock<User>({ id: reviewer.id, disabled: false, role: { scopes: [] } }),
			);
		});

		it('lists the proposals that the user can review', async () => {
			results.listForInbox.mockResolvedValue([
				{
					id: 'result',
					state: 'open',
					projectId,
					agentId,
					agentName: 'Support agent',
					summary: 'Fix the lookup tool',
					reviewState: 'open',
					appliedAutomatically: false,
					createdAt: now,
					updatedAt: now,
				},
			]);

			const items = await service.listForInbox(reviewer, { state: 'open', limit: 10 });

			expect(results.listForInbox).toHaveBeenCalledWith(
				{ userId: reviewer.id, hasGlobalAccess: false, projectRoles: ['project:editor'] },
				{ state: 'open', limit: 10 },
			);
			expect(items).toEqual([
				expect.objectContaining({
					type: 'self_healing_agent_result',
					id: 'result',
					state: 'open',
					createdAt: now.toISOString(),
					updatedAt: now.toISOString(),
				}),
			]);
		});

		it('counts with the same access as the list', async () => {
			results.countForInbox.mockResolvedValue({ open: 1, closed: 2 });

			await expect(service.countForInbox(reviewer)).resolves.toEqual({ open: 1, closed: 2 });
			expect(results.countForInbox).toHaveBeenCalledWith({
				userId: reviewer.id,
				hasGlobalAccess: false,
				projectRoles: ['project:editor'],
			});
		});

		it('rejects a disabled user', async () => {
			users.findByIdWithRole.mockResolvedValue(mock<User>({ disabled: true }));
			await expect(service.countForInbox(reviewer)).rejects.toThrow(ForbiddenError);
		});
	});
});
