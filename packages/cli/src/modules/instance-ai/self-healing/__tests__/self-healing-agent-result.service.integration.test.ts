import type { AgentProposalEdit, AgentProposalEvalCase } from '@n8n/api-types';
import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentProposalService } from '@/modules/agents/agent-proposal.service';
import type { AgentEvalProposalService } from '@/modules/agent-evals/agent-eval-proposal.service';
import { createOwner, createUser } from '@test-integration/db/users';

import { SelfHealingAgentInvestigation } from '../agents/database/self-healing-agent-investigation.entity';
import { SelfHealingAgentInvestigationRepository } from '../agents/database/self-healing-agent-investigation.repository';
import { SelfHealingAgentResult } from '../agents/database/self-healing-agent-result.entity';
import { SelfHealingAgentResultRepository } from '../agents/database/self-healing-agent-result.repository';
import { getAgentEvalProposals, getAgentServices } from '../agents/self-healing-agent-modules';
import {
	SELF_HEALING_AGENT_APPLY_LEASE_MS,
	SelfHealingAgentResultService,
} from '../agents/self-healing-agent-result.service';
import { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import { createAgentRow } from './support/agent';
import { createConfiguration, disableInstanceAdmins } from './support/configuration';

// The agents and agent-evals modules are not loaded. The test replaces their services.
vi.mock('../agents/self-healing-agent-modules', () => ({
	getAgentServices: vi.fn(),
	getAgentEvalProposals: vi.fn(),
}));

const usage = { credits: 1, turns: 2, durationSeconds: 30 };
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
const lastTested = {
	edits: [edit],
	evalCases: [evalCase],
	evidence: { ranAt: new Date().toISOString(), cases: [] },
};

const proposals = mock<AgentProposalService>();
const context = mock<AgentContextService>();
const evals = mock<AgentEvalProposalService>();

let service: SelfHealingAgentResultService;
let results: SelfHealingAgentResultRepository;
let investigations: SelfHealingAgentInvestigationRepository;
let configurations: SelfHealingConfigurationRepository;
let tx: TransactionRunner;
let db: DataSource;
let reviewer: User;
let project: Project;
let projectId: string;
let agentId: string;
let configurationId: number;

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	service = Container.get(SelfHealingAgentResultService);
	results = Container.get(SelfHealingAgentResultRepository);
	investigations = Container.get(SelfHealingAgentInvestigationRepository);
	configurations = Container.get(SelfHealingConfigurationRepository);
	tx = Container.get(TransactionRunner);
	db = Container.get(DataSource);
});

beforeEach(async () => {
	vi.resetAllMocks();
	vi.mocked(getAgentServices).mockResolvedValue({ proposals, context });
	vi.mocked(getAgentEvalProposals).mockResolvedValue(evals);
	proposals.checkApplicable.mockResolvedValue('ok');
	proposals.apply.mockResolvedValue({
		status: 'published',
		publishedVersionId: 'version-2',
		progress: { savedSkillIds: [], savedVersionId: 'version-2' },
	});

	// The reviewer enabled the configuration and is an editor of the project.
	reviewer = await createUser();
	project = await createTeamProject();
	await linkUserToProject(reviewer, project, 'project:editor');
	projectId = project.id;
	agentId = await createAgentRow(projectId);
	const configuration = await createConfiguration(projectId, reviewer.id);
	configuration.agentScope = 'all';
	await tx.run({}, async (ctx) => await configurations.saveConfiguration(configuration, ctx));
	configurationId = configuration.id;
});

afterEach(async () => {
	await db.createQueryBuilder().delete().from(SelfHealingAgentInvestigation).execute();
	await db.createQueryBuilder().delete().from(SelfHealingAgentResult).execute();
});

afterAll(async () => await testDb.terminate());

async function createInvestigation() {
	return await tx.run({}, async (ctx) => {
		return await investigations.createInvestigation(
			{
				configurationId,
				projectId,
				agentId,
				backgroundUserId: reviewer.id,
				trigger: 'manual',
				agentVersionId: 'version-1',
				traceWindowStart: null,
				traceWindowEnd: new Date(),
				traceCount: 3,
				threadId: randomUUID(),
				runId: randomUUID(),
			},
			ctx,
		);
	});
}

async function completeProposal() {
	const investigation = await createInvestigation();
	const saved = await service.complete({
		investigationId: investigation.id,
		agentName: 'Support agent',
		goals: ['quality'],
		output: { outcome: 'proposal', summary: 'Fix the lookup tool', report: 'Report.' },
		lastTested,
		usage,
	});
	return { investigation, saved };
}

it('saves an open proposal, finishes the investigation and shows it only to a reviewer', async () => {
	const { investigation, saved } = await completeProposal();

	expect(saved).toMatchObject({
		actor: { id: reviewer.id },
		publicationMode: 'approval',
		result: { reviewState: 'open', baseVersionId: 'version-1', agentName: 'Support agent' },
	});
	expect(await investigations.findInvestigation(investigation.id)).toMatchObject({
		outcome: 'proposal',
		resultId: saved?.result.id,
		usage,
	});
	expect(await investigations.getUnfinishedForAgent(agentId)).toBeNull();

	const resultId = saved?.result.id ?? '';
	await expect(service.getDetail(reviewer, projectId, resultId)).resolves.toMatchObject({
		resultId,
		reviewState: 'open',
		edits: [edit],
		evalCases: [evalCase],
		closedAt: null,
		closedBy: null,
	});
	await expect(service.countForInbox(reviewer)).resolves.toEqual({ open: 1, closed: 0 });

	// An editor of the project who is not a reviewer of the configuration.
	await disableInstanceAdmins();
	const editor = await createUser();
	await linkUserToProject(editor, project, 'project:editor');
	await expect(service.getDetail(editor, projectId, resultId)).rejects.toThrow(NotFoundError);
	await expect(service.countForInbox(editor)).resolves.toEqual({ open: 0, closed: 0 });
});

it('saves no proposal when the configuration was paused during the run', async () => {
	const investigation = await createInvestigation();
	await tx.run({}, async (ctx) => {
		const configuration = await configurations.findForUpdate(configurationId, projectId, ctx);
		if (!configuration) throw new Error('The configuration is missing.');
		configuration.enabled = false;
		await configurations.saveConfiguration(configuration, ctx);
	});

	const saved = await service.complete({
		investigationId: investigation.id,
		agentName: 'Support agent',
		goals: ['quality'],
		output: { outcome: 'proposal', summary: 'Fix the lookup tool', report: 'Report.' },
		lastTested,
		usage,
	});

	expect(saved).toBeNull();
	expect(await investigations.findInvestigation(investigation.id)).toMatchObject({
		outcome: 'failed',
		failureReason: 'configuration_paused',
		resultId: null,
	});
	expect(await results.getOpenForAgent(agentId)).toBeNull();
});

it('keeps the progress of a failed apply and finishes the remaining step in a retry', async () => {
	const { saved } = await completeProposal();
	const resultId = saved?.result.id ?? '';
	proposals.apply.mockResolvedValueOnce({
		status: 'failed',
		retryable: true,
		error: 'The agent is locked by another editor.',
		progress: { savedSkillIds: [], savedVersionId: null },
	});

	const failed = await service.apply(reviewer, projectId, resultId);

	expect(failed).toMatchObject({
		reviewState: 'open',
		applyError: 'The agent is locked by another editor.',
		applyProgress: { evalsApplied: true, agentPublished: false },
		closedAt: null,
	});
	// The failed apply released its claim.
	expect((await results.getResult(resultId, projectId)).applyStartedAt).toBeNull();

	const applied = await service.apply(reviewer, projectId, resultId);

	expect(evals.applyCases).toHaveBeenCalledOnce();
	expect(proposals.apply).toHaveBeenCalledTimes(2);
	expect(applied).toMatchObject({
		reviewState: 'applied',
		appliedAutomatically: false,
		publishedVersionId: 'version-2',
		applyError: null,
		applyProgress: { evalsApplied: true, savedVersionId: 'version-2', agentPublished: true },
		closedBy: { id: reviewer.id },
	});
	expect(applied.closedAt).not.toBeNull();
	await expect(service.countForInbox(reviewer)).resolves.toEqual({ open: 0, closed: 1 });
	await expect(service.dismiss(reviewer, projectId, resultId)).rejects.toThrow(ConflictError);
});

it('rejects a second apply and a dismiss while an apply holds the claim', async () => {
	const { saved } = await completeProposal();
	const resultId = saved?.result.id ?? '';
	const staleBefore = new Date(Date.now() - SELF_HEALING_AGENT_APPLY_LEASE_MS);
	expect(await results.claimApply(resultId, staleBefore)).toBe(true);

	await expect(service.apply(reviewer, projectId, resultId)).rejects.toThrow(ConflictError);
	await expect(service.dismiss(reviewer, projectId, resultId)).rejects.toThrow(ConflictError);
	expect(proposals.apply).not.toHaveBeenCalled();

	// The apply that held the claim stopped.
	await results.saveApplyProgress(resultId, {
		applyProgress: (await results.getResult(resultId, projectId)).applyProgress,
		applyError: null,
		releaseClaim: true,
	});
	await expect(service.dismiss(reviewer, projectId, resultId)).resolves.toMatchObject({
		reviewState: 'dismissed',
		closedBy: { id: reviewer.id },
	});
});

it('applies automatically with the access of the actor and records no closing user', async () => {
	const { saved } = await completeProposal();
	if (!saved) throw new Error('The proposal was not saved.');
	// The instance owner is not a listed reviewer of the configuration.
	const owner = await createOwner();

	await service.applyAutomatically(owner, saved.result);

	await expect(service.getDetail(reviewer, projectId, saved.result.id)).resolves.toMatchObject({
		reviewState: 'applied',
		appliedAutomatically: true,
		publishedVersionId: 'version-2',
		closedBy: null,
	});
});
