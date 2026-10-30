import type { ProjectScopeService } from '@n8n/backend-services';
import type { OperationContext, TransactionRunner, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SkillFile } from '../../database/entities/skill-file.entity';
import type { SkillVersion } from '../../database/entities/skill-version.entity';
import type { Skill } from '../../database/entities/skill.entity';
import type { SkillRepository } from '../../database/repositories/skill.repository';
import { SkillAccessService } from '../../services/skill-access.service';
import { SkillRuntimeService } from '../../services/skill-runtime.service';
import { SkillUsageProxy } from '../../services/skill-usage-proxy.service';
import { SkillService } from '../../services/skill.service';
import type { SkillsTelemetry } from '../../services/skills-telemetry.service';
import type { AssistantSkillsFlagGate } from '../../services/assistant-skills-flag-gate';
import type { SkillSyncedFromService } from '../../services/skill-synced-from.service';
import type { SkillSyncFlagGate } from '../../services/skill-sync-flag-gate';
import type { SkillSourceRepository } from '../../database/repositories/skill-source.repository';
import type { ResolvedSkillRow } from '../../utils/skill-content';
import { skillContentHash } from '../../utils/skill-content-hash';
import { FakeSkillUsage } from '../../testing';

export const PROJECT = 'project-1';

export const TX_CTX = { trx: {} } as OperationContext;

export async function expectError(
	promise: Promise<unknown>,
	errorClass: new (...args: never[]) => Error,
	message: string,
) {
	const error: unknown = await promise.then(
		() => undefined,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(errorClass);
	expect(error).toHaveProperty('message', message);
}

export function skillRow(
	id: string,
	target: Partial<Pick<Skill, 'projectId' | 'agentId'>> = {},
): Skill {
	return mock<Skill>({ id, projectId: target.projectId ?? null, agentId: target.agentId ?? null });
}

export function versionRow(
	skill: Skill,
	version: number,
	overrides: Partial<SkillVersion> = {},
	files: Array<{ path: string; content: string }> = [],
): ResolvedSkillRow {
	const base = {
		name: 'Brand voice',
		description: 'Write in our voice',
		instructions: 'Use short sentences.',
		frontmatter: null,
		...overrides,
	};
	const contentHash =
		overrides.contentHash ??
		skillContentHash({
			name: base.name,
			description: base.description,
			instructions: base.instructions,
			frontmatter: base.frontmatter,
			files,
		});
	return {
		skill,
		version: mock<SkillVersion>({
			id: `${skill.id}-v${version}`,
			skillId: skill.id,
			version,
			...base,
			contentHash,
		}),
		files: files.map((file) => mock<SkillFile>(file)),
	};
}

/**
 * The three skills services, real, over a mocked repository and transactions. The agents
 * side is `FakeSkillUsage` behind a real `SkillUsageProxy`: seed it with `usage.seed`.
 */
export function createSkillServices() {
	const skills = mock<SkillRepository>();
	const usage = new FakeSkillUsage();
	const skillUsage = new SkillUsageProxy();
	skillUsage.register(usage);
	const txRunner = mock<TransactionRunner>();
	const projectScope = mock<ProjectScopeService>();
	const telemetry = mock<SkillsTelemetry>();
	const users = mock<UserRepository>();
	const assistantGate = mock<AssistantSkillsFlagGate>();
	const syncedFrom = mock<SkillSyncedFromService>();
	const links = mock<SkillSourceRepository>();
	const skillSyncGate = mock<SkillSyncFlagGate>();
	const access = new SkillAccessService(skills, projectScope, skillUsage);
	const runtime = new SkillRuntimeService(skills, projectScope, access);
	const service = new SkillService(
		mock(),
		skills,
		txRunner,
		projectScope,
		users,
		skillUsage,
		access,
		runtime,
		telemetry,
		assistantGate,
		syncedFrom,
		links,
		skillSyncGate,
	);
	return {
		skills,
		usage,
		skillUsage,
		txRunner,
		projectScope,
		telemetry,
		users,
		assistantGate,
		syncedFrom,
		links,
		skillSyncGate,
		access,
		runtime,
		service,
	};
}

/** The mock answers that most skills tests start from, and no agents. */
export async function resetSkillMocks({
	skills,
	usage,
	txRunner,
	links,
	skillSyncGate,
}: Pick<ReturnType<typeof createSkillServices>, 'skills' | 'usage' | 'txRunner'> &
	Partial<Pick<ReturnType<typeof createSkillServices>, 'links' | 'skillSyncGate'>>) {
	vi.restoreAllMocks();
	vi.resetAllMocks();
	await usage.seed({ agents: [], skills: [] });
	txRunner.run.mockImplementation(async (_ctx, fn) => await fn(TX_CTX));
	skills.findLatestSaved.mockResolvedValue(new Map());
	skills.findLatestNamesInTarget.mockResolvedValue([]);
	skills.findLatestSummaries.mockResolvedValue(new Map());
	skills.findVersionsByIds.mockResolvedValue(new Map());
	skills.findByIds.mockResolvedValue([]);
	// No skill is synced unless a test links it.
	links?.isLinked.mockResolvedValue(false);
	links?.findLinkedSkillIds.mockResolvedValue(new Set());
	// Skill Sync is off unless a test turns it on.
	skillSyncGate?.isEnabled.mockResolvedValue(false);
}
