import type { ProjectPublishJudge, PublishJudgeSettings, PutPublishJudgeDto } from '@n8n/api-types';
import {
	DEFAULT_PUBLISH_JUDGE_EVENTS,
	publishJudgeEventSchema,
	publishJudgeModeSchema,
	publishJudgeOnUnavailableSchema,
	publishJudgeTypeSchema,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ProjectRepository, SettingsRepository, WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { JUDGE_START_NODE_TYPES } from './publish-judge-runner.service';

const KEY_PREFIX = 'publishJudge';

const storedJudgeSchema = z.object({
	judgeType: publishJudgeTypeSchema,
	judgeId: z.string(),
	onUnavailable: publishJudgeOnUnavailableSchema,
	events: z.array(publishJudgeEventSchema).default(DEFAULT_PUBLISH_JUDGE_EVENTS),
	mode: publishJudgeModeSchema.default('enforce'),
});

type StoredJudge = z.infer<typeof storedJudgeSchema>;

/** A judge that applies to a publish, with the scope that configured it. */
export type ApplicableJudge = StoredJudge & { scope: 'instance' | 'project' };

/** `null` is the instance scope. */
const LIBRARY_KEY = `${KEY_PREFIX}.libraryProjectId`;
const LIBRARY_PROJECT_NAME = 'Policy judges';

const PROJECT_KEY_PREFIX = `${KEY_PREFIX}.project.`;

const keyFor = (projectId: string | null) =>
	projectId === null ? `${KEY_PREFIX}.instance` : `${PROJECT_KEY_PREFIX}${projectId}`;

function parseStored(value: string | undefined): StoredJudge | undefined {
	if (!value) return undefined;

	const parsed = storedJudgeSchema.safeParse(jsonParse(value, { fallbackValue: null }));
	return parsed.success ? parsed.data : undefined;
}

/** Prototype storage in the settings table: one row for the instance, one for each project. */
@Service()
export class PublishJudgeSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
	) {}

	/** Both judges must allow a publish. The instance judge comes first. */
	async judgesFor(projectId: string | null): Promise<ApplicableJudge[]> {
		const instanceKey = keyFor(null);
		const keys = projectId ? [instanceKey, keyFor(projectId)] : [instanceKey];
		const rows = await this.settingsRepository.findByKeys(keys);

		const judges: ApplicableJudge[] = [];
		for (const key of keys) {
			const stored = parseStored(rows.find((row) => row.key === key)?.value);
			if (stored) judges.push({ ...stored, scope: key === instanceKey ? 'instance' : 'project' });
		}

		return judges;
	}

	/**
	 * The project that holds the judge workflows and agents, apart from the work they review.
	 * It has no members, so only instance admins see it. `null` until an admin creates it.
	 */
	async getLibraryProjectId(): Promise<string | null> {
		const id = (await this.settingsRepository.findByKey(LIBRARY_KEY))?.value;
		if (!id) return null;

		const [existing] = await this.projectRepository.findExistingIds([id]);
		return existing ?? null;
	}

	async ensureLibraryProject(admin: User): Promise<string> {
		const existing = await this.getLibraryProjectId();
		if (existing) return existing;

		const project = await this.projectService.createTeamProject(admin, {
			name: LIBRARY_PROJECT_NAME,
			icon: { type: 'icon', value: 'scale' },
		});
		await this.settingsRepository.upsertByKey(LIBRARY_KEY, project.id, false, {});

		return project.id;
	}

	/** Every project judge, for the page where an instance admin manages them. */
	async listProjectJudges(): Promise<ProjectPublishJudge[]> {
		const rows = await this.settingsRepository.findByKeyPrefix(PROJECT_KEY_PREFIX);
		const judges: ProjectPublishJudge[] = [];

		for (const row of rows) {
			const stored = parseStored(row.value);
			if (!stored) continue;

			judges.push({
				...(await this.toSettings(stored)),
				projectId: row.key.slice(PROJECT_KEY_PREFIX.length),
			});
		}

		return judges;
	}

	async get(projectId: string | null): Promise<PublishJudgeSettings | null> {
		const row = await this.settingsRepository.findByKey(keyFor(projectId));
		const stored = parseStored(row?.value);
		if (!stored) return null;

		return await this.toSettings(stored);
	}

	async set(
		projectId: string | null,
		{ judgeType, judgeId, onUnavailable, events, reviewAgents, mode }: PutPublishJudgeDto,
		user: User,
	): Promise<PublishJudgeSettings | null> {
		const key = keyFor(projectId);

		if (judgeId === null) {
			await this.settingsRepository.delete({ key });
			return null;
		}

		const stored: StoredJudge = {
			judgeType,
			judgeId,
			onUnavailable,
			mode: mode ?? 'enforce',
			events: events ?? [
				...DEFAULT_PUBLISH_JUDGE_EVENTS,
				...(reviewAgents ? ['agentPublish' as const] : []),
			],
		};
		await this.assertCanJudge(stored, user);
		await this.settingsRepository.upsertByKey(key, JSON.stringify(stored), false, {});

		return await this.get(projectId);
	}

	private async toSettings(stored: StoredJudge): Promise<PublishJudgeSettings> {
		return {
			...stored,
			reviewAgents: stored.events.includes('agentPublish'),
			judgeName: await this.nameOf(stored),
		};
	}

	/** Name and project of a judge, for the history and its links. `null` when it is gone. */
	async describe(judge: Pick<StoredJudge, 'judgeType' | 'judgeId'>) {
		if (judge.judgeType === 'agent') {
			const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
			const agent = await Container.get(AgentRepository).findById(judge.judgeId);

			return agent ? { name: agent.name, projectId: agent.projectId } : null;
		}

		const workflow = await this.workflowRepository.findById(judge.judgeId);
		const projectId = workflow?.shared?.find((share) => share.role === 'workflow:owner')?.projectId;

		return workflow ? { name: workflow.name, projectId: projectId ?? null } : null;
	}

	private async nameOf({
		judgeType,
		judgeId,
	}: Pick<StoredJudge, 'judgeType' | 'judgeId'>): Promise<string | null> {
		if (judgeType === 'agent') {
			const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');

			return (await Container.get(AgentRepository).findById(judgeId))?.name ?? null;
		}

		const [workflow] = await this.workflowRepository.findByIds([judgeId], {
			fields: ['id', 'name'],
		});

		return workflow?.name ?? null;
	}

	/** The admin must be able to read the judge, so a judge is never a guessed id. */
	private async assertCanJudge(
		{ judgeType, judgeId }: Pick<StoredJudge, 'judgeType' | 'judgeId'>,
		user: User,
	) {
		if (judgeType === 'agent') {
			const { AgentsService } = await import('@/modules/agents/agents.service.js');
			const agent = await Container.get(AgentsService).findByIdForUser(judgeId, user);

			if (!agent) throw new UserError('The judge agent was not found');
			return;
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(judgeId, user, [
			'workflow:read',
		]);

		if (!workflow) throw new UserError('The judge workflow was not found');

		if (!workflow.nodes.some((node) => JUDGE_START_NODE_TYPES.includes(node.type))) {
			throw new UserError('The judge workflow needs a Judge Trigger node');
		}
	}
}
