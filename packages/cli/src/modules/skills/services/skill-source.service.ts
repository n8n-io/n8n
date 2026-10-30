import {
	AGENT_SKILL_NAME_MAX_LENGTH,
	agentSkillSchema,
	type AgentSkill,
	type AddSkillSourceSkillsDto,
	type SkillSourceListItem,
	type SkillSourceMoreDiscovery,
	type ConnectSkillSourceDto,
	type DiscoverSkillSourceDto,
	type DiscoveredSkill,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
	type SkillSourceDuplicate,
	type SkillSourceReason,
} from '@n8n/api-types';
import { TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UnexpectedError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';

import type {
	SkillSourceConnection,
	SkillSourceType,
} from '../database/entities/skill-source-connection.entity';
import {
	DuplicateSkillSourceError,
	SkillSourceRepository,
} from '../database/repositories/skill-source.repository';
import { SkillRepository } from '../database/repositories/skill.repository';
import {
	SkillSourceRequestError,
	skillSourceReasonOf,
	toSkillSourceRequestError,
} from '../errors/skill-source-request.error';
import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';
import {
	skillSourceIdentityKey,
	type FetchedSkill,
	type RemoteSkillRef,
	type SkillSourceClient,
	type SkillSourceLocator,
} from '../sources/skill-source-client';
import { contentToAgentSkill, toSkillContent, type SkillTarget } from '../utils/skill-content';
import { skillContentHash } from '../utils/skill-content-hash';
import { SkillAccessService } from './skill-access.service';
import { isNameTaken } from './skill.policy';
import { SkillService } from './skill.service';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillsTelemetry, type SkillSourceTelemetryReason } from './skills-telemetry.service';

/** Skills fetched at the same time from one source. */
const FETCH_CONCURRENCY = 8;

/**
 * What an imported skill must be. Skills ignore `allowedTools`, as a create does. The name is
 * trimmed as a create stores it, so the name checks and the baseline hash match the stored skill.
 */
const importableSkillSchema = agentSkillSchema
	.omit({ allowedTools: true })
	.extend({ name: z.string().trim().min(1).max(AGENT_SKILL_NAME_MAX_LENGTH) });

type ScopeType = 'global' | 'team' | 'personal';

/** A source that a link points to, before anything is stored. */
type ParsedSource = {
	client: SkillSourceClient;
	type: SkillSourceType;
	locator: SkillSourceLocator;
	identityKey: string;
};

/** The skills of a source at one revision. */
type Discovered = {
	refs: RemoteSkillRef[];
	truncated: boolean;
	/** Skills that the client did not list, as they are too deep in the source. */
	tooDeep: number;
	revision?: string;
};

/** The properties of `User connected skill source` that a request fills in as it goes. */
type ConnectReport = {
	provider: SkillSourceType;
	access: 'public';
	scope_type: ScopeType;
	duplicate_result: SkillSourceDuplicate['kind'];
};

/** One skill of the source, read and checked against the rules of n8n skills. */
type ReadSkill = {
	key: string;
	ref: RemoteSkillRef;
	fetched?: FetchedSkill;
	skill?: AgentSkill;
	error?: { reason: SkillSourceReason; message: string };
};

/**
 * Connects sources and imports their skills. A source lives in one scope, and its skills get
 * that scope. The service checks access itself, and writes skills only through
 * `SkillService.createTrusted`, so the skill rules stay in one place.
 */
@Service()
export class SkillSourceService {
	constructor(
		private readonly flagGate: SkillSyncFlagGate,
		private readonly skillAccess: SkillAccessService,
		private readonly skillService: SkillService,
		private readonly skillRepository: SkillRepository,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly clients: SkillSourceClientRegistry,
		private readonly txRunner: TransactionRunner,
		private readonly skillsTelemetry: SkillsTelemetry,
	) {}

	/**
	 * Reads a link and lists its skills for the picker. Writes nothing. The connect funnel
	 * stops here for a link that fails or a blocked duplicate, so telemetry reports those as
	 * a failed connect. A discover that succeeds reports nothing: the connect reports it.
	 */
	async discover(user: User, payload: DiscoverSkillSourceDto): Promise<SkillSourceDiscovery> {
		await this.flagGate.assertEnabled(user);
		const { target, scopeType } = await this.resolveScope(user, payload);
		const report = connectReport(scopeType);
		try {
			const source = await this.parse(payload.url);
			report.provider = source.type;
			const duplicate = await this.duplicateOf(user, source.identityKey, target.projectId);
			report.duplicate_result = duplicate.kind;
			const { client, locator } = source;
			const summary = {
				type: source.type,
				...client.describe(locator),
				webUrl: client.webUrl(locator),
			};
			if (duplicate.kind === 'blocked') {
				await this.skillsTelemetry.connectedSource(
					{ ...report, status: 'failure', reason: 'duplicate_source' },
					user.id,
				);
				// Add more reads the saved source. The submitted branch or folder may have no skills.
				return { source: summary, duplicate, skills: [], truncated: false, tooDeep: 0 };
			}
			const discovered = await this.discoverAll(source);
			const skills = await this.readAll(source, discovered);
			const names = await this.skillRepository.findLatestNamesInTarget(target);
			return {
				source: summary,
				duplicate,
				skills: this.pickerSkills(source, skills, names),
				truncated: discovered.truncated,
				tooDeep: discovered.tooDeep,
			};
		} catch (error) {
			await this.skillsTelemetry.connectedSource(
				{ ...report, status: 'failure', reason: telemetryReasonOf(error) },
				user.id,
			);
			throw error;
		}
	}

	/**
	 * Connects the source in the scope and imports the picked skills, in one transaction. A
	 * picked skill that cannot come in, such as one with a taken name, is reported and the
	 * others come in. If none comes in, nothing is stored. Telemetry reports every attempt.
	 */
	async connect(user: User, payload: ConnectSkillSourceDto): Promise<SkillSourceConnectResponse> {
		await this.flagGate.assertEnabled(user);
		const { target, scopeType } = await this.resolveScope(user, payload);
		const report = connectReport(scopeType);
		try {
			const source = await this.parse(payload.url);
			report.provider = source.type;
			const duplicate = await this.duplicateOf(user, source.identityKey, target.projectId);
			report.duplicate_result = duplicate.kind;
			if (duplicate.kind === 'blocked') throw duplicateError(duplicate.where);
			const { response, warning } = await this.importSkills(
				user,
				source,
				target,
				payload.skillKeys,
				scopeType,
			);
			await this.skillsTelemetry.connectedSource(
				{ ...report, status: 'success', ...(warning ? { reason: warning } : {}) },
				user.id,
			);
			return response;
		} catch (error) {
			await this.skillsTelemetry.connectedSource(
				{ ...report, status: 'failure', reason: telemetryReasonOf(error) },
				user.id,
			);
			throw error;
		}
	}

	/** The minimal Sources tab. All filtering happens before source data leaves the service. */
	async list(user: User): Promise<SkillSourceListItem[]> {
		await this.flagGate.assertEnabled(user);
		const sources = await this.sourceRepository.findVisible(
			await this.skillAccess.visibleSourceProjects(user),
		);
		const counts = await this.sourceRepository.countSkills(sources.map((source) => source.id));
		const projects = await this.skillRepository.findProjects(
			sources.flatMap((source) => (source.projectId ? [source.projectId] : [])),
		);
		const canAdd = await this.skillAccess.sourceAccessCheck(user, 'addSkills');
		return sources.map((source) => {
			const project = source.projectId ? projects.get(source.projectId) : undefined;
			return this.sourceItem(source, counts.get(source.id) ?? 0, project, canAdd(source));
		});
	}

	/** Lists only remote skills that are not linked to this source. */
	async discoverMore(user: User, sourceId: string): Promise<SkillSourceMoreDiscovery> {
		const stored = await this.requireAddAccess(user, sourceId);
		const source = this.connectedSource(stored);
		const linked = await this.sourceRepository.findImportedRefs(sourceId);
		const linkedKeys = new Set(linked.map(refKey));
		const discovered = await this.discoverAll(source);
		const reads = await this.readAll(source, {
			...discovered,
			refs: discovered.refs.filter((ref) => !linkedKeys.has(refKey(ref))),
		});
		const names = await this.skillRepository.findLatestNamesInTarget({
			projectId: stored.projectId,
			agentId: null,
		});
		const project = stored.projectId
			? (await this.skillRepository.findProjects([stored.projectId])).get(stored.projectId)
			: undefined;
		return {
			source: this.sourceItem(stored, linked.length, project, true),
			skills: this.pickerSkills(source, reads, names),
			truncated: discovered.truncated,
			tooDeep: discovered.tooDeep,
		};
	}

	async addSkills(
		user: User,
		sourceId: string,
		payload: AddSkillSourceSkillsDto,
	): Promise<SkillSourceConnectResponse> {
		const stored = await this.requireAddAccess(user, sourceId);
		const project = stored.projectId
			? (await this.skillRepository.findProjects([stored.projectId])).get(stored.projectId)
			: undefined;
		const scopeType =
			stored.projectId === null ? 'global' : project?.type === 'personal' ? 'personal' : 'team';
		const { response } = await this.importSkills(
			user,
			this.connectedSource(stored),
			{ projectId: stored.projectId, agentId: null },
			payload.skillKeys,
			scopeType,
			sourceId,
		);
		return response;
	}

	private async requireAddAccess(user: User, sourceId: string): Promise<SkillSourceConnection> {
		await this.flagGate.assertEnabled(user);
		const source = await this.sourceRepository.findById(sourceId);
		if (!source) throw new NotFoundError('Skill source not found');
		if (!(await this.skillAccess.canOnSource(user, source, 'addSkills'))) {
			if (!(await this.skillAccess.canOnSource(user, source, 'view'))) {
				throw new NotFoundError('Skill source not found');
			}
			throw new ForbiddenError('You are not allowed to add skills to this source.');
		}
		return source;
	}

	private connectedSource(source: SkillSourceConnection): ParsedSource {
		const client = this.clients.get(source.type);
		if (!client) throw new UnexpectedError('Skill source client not registered');
		return {
			client,
			type: source.type,
			identityKey: source.identityKey,
			locator: client.sourceLocator(source.locator),
		};
	}

	private sourceItem(
		source: SkillSourceConnection,
		skillCount: number,
		project: { name: string; type: 'personal' | 'team' } | undefined,
		canAddSkills: boolean,
	): SkillSourceListItem {
		const { client, locator } = this.connectedSource(source);
		return {
			id: source.id,
			type: source.type,
			...client.describe(locator),
			webUrl: client.webUrl(locator),
			scope: source.projectId === null ? 'instance' : 'project',
			projectId: source.projectId,
			projectName: project?.name ?? null,
			projectType: project?.type ?? null,
			skillCount,
			canAddSkills,
		};
	}

	private pickerSkills(
		source: ParsedSource,
		reads: ReadSkill[],
		names: { skillId: string; name: string }[],
	): DiscoveredSkill[] {
		return reads.map((read) => ({
			key: read.key,
			location: source.client.location(read.ref),
			name: read.skill?.name ?? read.fetched?.content.name ?? null,
			description: read.skill?.description ?? read.fetched?.content.description ?? null,
			skippedFiles: read.fetched?.skippedFiles ?? [],
			nameTaken: read.skill !== undefined && isNameTaken(read.skill.name, names),
			error: read.error ?? null,
			webUrl: source.client.webUrl(source.locator, read.ref),
		}));
	}

	// ---------------------------------------------------------------- steps

	private async importSkills(
		user: User,
		source: ParsedSource,
		target: SkillTarget,
		skillKeys: string[],
		scopeType: ScopeType,
		existingSourceId?: string,
	): Promise<{ response: SkillSourceConnectResponse; warning?: SkillSourceReason }> {
		const keys = [...new Set(skillKeys)];
		const failed: SkillSourceConnectResponse['failed'] = [];
		const imported: SkillSourceConnectResponse['imported'] = [];
		let skippedFiles = 0;
		const track = async (status: 'success' | 'failure', reason?: SkillSourceTelemetryReason) =>
			await this.skillsTelemetry.importedFromSource(
				{
					provider: source.type,
					scope_type: scopeType,
					first_or_more: existingSourceId ? 'more' : 'first',
					selected: keys.length,
					imported: imported.length,
					name_taken: failed.filter((failure) => failure.reason === 'name_taken').length,
					skipped_files: skippedFiles,
					status,
					...(reason ? { reason } : {}),
				},
				user.id,
			);

		const sourceId = existingSourceId ?? uuidv7();
		let discovered: Discovered;
		try {
			discovered = await this.discoverAll(source);
			const byKey = new Map(discovered.refs.map((ref) => [refKey(ref), ref]));
			const picked: RemoteSkillRef[] = [];
			for (const key of keys) {
				const ref = byKey.get(key);
				if (ref) picked.push(ref);
				else failed.push({ key, name: null, reason: 'not_found' });
			}
			const reads = await this.readAll(source, { ...discovered, refs: picked });
			for (const read of reads) {
				if (read.error) failed.push({ key: read.key, name: null, reason: read.error.reason });
			}

			await this.txRunner.run({}, async (ctx) => {
				if (existingSourceId) {
					const current = await this.sourceRepository.lockForImport(existingSourceId, ctx);
					if (!current) throw new NotFoundError('Skill source not found');
					if (current.projectId !== target.projectId) {
						throw new ConflictError('The source scope changed. Open Add more skills again.');
					}
				} else {
					try {
						await this.sourceRepository.insertConnected(
							{
								id: sourceId,
								type: source.type,
								locator: source.locator,
								identityKey: source.identityKey,
								projectId: target.projectId,
								createdById: user.id,
							},
							ctx,
						);
					} catch (error) {
						if (error instanceof DuplicateSkillSourceError) throw duplicateError('scope');
						throw error;
					}
				}
				const linked = existingSourceId
					? new Set(
							(await this.sourceRepository.findImportedRefs(existingSourceId, ctx)).map(refKey),
						)
					: new Set<string>();
				// Read in the transaction, so a skill created meanwhile is not shadowed. Each import
				// adds its name, so two picked skills with one name do not both come in.
				const names = await this.skillRepository.findLatestNamesInTarget(target, ctx);
				for (const read of reads) {
					const { skill, fetched } = read;
					if (!skill || !fetched) continue;
					if (linked.has(read.key)) {
						failed.push({ key: read.key, name: skill.name, reason: 'duplicate_source' });
						continue;
					}
					if (isNameTaken(skill.name, names)) {
						failed.push({ key: read.key, name: skill.name, reason: 'name_taken' });
						continue;
					}
					const { frontmatter } = fetched.content;
					const skillId = await this.skillService.createTrusted(
						{
							id: `skill_${generateNanoId()}`,
							target,
							skill,
							source: source.type,
							createdById: user.id,
							frontmatter,
							sourceRevision: fetched.revision,
						},
						ctx,
					);
					await this.sourceRepository.insertImported(
						{
							skillId,
							sourceId,
							remoteRef: read.ref,
							baseRevision: fetched.revision,
							baseContentHash: skillContentHash(toSkillContent(skill, frontmatter)),
							skippedFiles: fetched.skippedFiles,
						},
						ctx,
					);
					linked.add(read.key);
					names.push({ skillId, name: skill.name });
					imported.push({ key: read.key, skillId, name: skill.name });
					skippedFiles += fetched.skippedFiles.length;
				}
				if (imported.length === 0) {
					const reason = failed[0]?.reason ?? 'no_skills_found';
					throw new SkillSourceRequestError(
						reason,
						reason === 'name_taken'
							? 'Every picked skill has a name that this scope already has.'
							: 'n8n could not import any of the picked skills.',
					);
				}
			});
		} catch (error) {
			// The transaction rolled back, so nothing came in.
			imported.length = 0;
			skippedFiles = 0;
			await track('failure', telemetryReasonOf(error));
			throw error;
		}

		await track('success');
		await this.skillsTelemetry.created(
			user.id,
			imported.map(({ skillId }) => ({ id: skillId, ...target })),
			source.type,
			'sync',
		);
		return { response: { sourceId, imported, failed }, warning: warningOf(discovered) };
	}

	/**
	 * The scope of the source, by the rules of a skill create: Global (`instance`) or a project
	 * where the user can create skills, which is the connect permission of a source.
	 */
	private async resolveScope(
		user: User,
		payload: { scope: 'instance' | 'project'; projectId?: string },
	): Promise<{ target: SkillTarget; scopeType: ScopeType }> {
		const target = await this.skillAccess.resolveCreateTarget(user, payload);
		if (target.projectId === null) return { target, scopeType: 'global' };
		const project = (await this.skillRepository.findProjects([target.projectId])).get(
			target.projectId,
		);
		return { target, scopeType: project?.type === 'personal' ? 'personal' : 'team' };
	}

	/** The client that handles the link, and the source it points to. */
	private async parse(url: string): Promise<ParsedSource> {
		const client = this.clients
			.types()
			.map((type) => this.clients.get(type))
			.find((candidate) => candidate?.handles(url));
		if (!client) {
			if (isWebLink(url)) {
				throw new SkillSourceRequestError(
					'unsupported_provider',
					'n8n reads skills only from GitHub. Use https://github.com/owner/repo.',
				);
			}
			throw new SkillSourceRequestError(
				'invalid_url',
				'This is not a GitHub repository link. Use https://github.com/owner/repo.',
			);
		}
		try {
			const locator = await client.parseLocator(url);
			return {
				client,
				// The registry holds only the clients of stored source types.
				type: client.type as SkillSourceType,
				locator,
				identityKey: skillSourceIdentityKey(client.identity(locator)),
			};
		} catch (error) {
			throw toSkillSourceRequestError(error);
		}
	}

	/**
	 * The duplicate rules. A source in Global or in the chosen scope blocks the connect. A
	 * source in another project that the user can see gives a warning. A source in a project
	 * that the user cannot see changes nothing, so the answer never reveals it.
	 */
	private async duplicateOf(
		user: User,
		identityKey: string,
		projectId: string | null,
	): Promise<SkillSourceDuplicate> {
		const same = await this.sourceRepository.findSameSources(identityKey);
		if (same.length === 0) return { kind: 'none' };
		const blocking =
			same.find((source) => source.projectId === null) ??
			same.find((source) => source.projectId === projectId);
		if (blocking) {
			const canAdd = await this.skillAccess.canOnSource(user, blocking, 'addSkills');
			return {
				kind: 'blocked',
				where: blocking.projectId === null ? 'global' : 'scope',
				sourceId: canAdd ? blocking.id : null,
			};
		}
		const visible = await this.skillAccess.visibleSourceProjects(user);
		const shownIds = same.flatMap(({ projectId: id }) =>
			id !== null && (visible === 'all' || visible.includes(id)) ? [id] : [],
		);
		if (shownIds.length === 0) return { kind: 'none' };
		const projects = await this.skillRepository.findProjects(shownIds);
		return {
			kind: 'warning',
			projects: shownIds.map((id) => ({ id, name: projects.get(id)?.name ?? id })),
		};
	}

	private async discoverAll(source: ParsedSource): Promise<Discovered> {
		const refs: RemoteSkillRef[] = [];
		let truncated = false;
		let tooDeep = 0;
		let revision: string | undefined;
		let cursor: string | undefined;
		try {
			do {
				const page = await source.client.discover(source.locator, undefined, cursor);
				refs.push(...page.items);
				truncated ||= page.truncated === true;
				tooDeep += page.tooDeep ?? 0;
				revision ??= page.revision;
				cursor = page.next;
			} while (cursor !== undefined);
		} catch (error) {
			throw toSkillSourceRequestError(error);
		}
		if (refs.length === 0) {
			if (tooDeep > 0) {
				throw new SkillSourceRequestError(
					'too_deep',
					'The SKILL.md files here are in folders too deep for n8n to read. Link to a folder nearer to the skills.',
				);
			}
			throw new SkillSourceRequestError(
				'no_skills_found',
				'n8n found no skills here. A skill is a folder with a SKILL.md file.',
			);
		}
		return { refs, truncated, tooDeep, revision };
	}

	/**
	 * Fetches each skill at the revision that discover listed, and checks it against the rules
	 * of n8n skills. A skill that n8n cannot read gets an error. A failure of the whole source,
	 * such as a rate limit, fails the request.
	 */
	private async readAll(source: ParsedSource, discovered: Discovered): Promise<ReadSkill[]> {
		const { refs, revision } = discovered;
		const reads: ReadSkill[] = [];
		for (let start = 0; start < refs.length; start += FETCH_CONCURRENCY) {
			const batch = refs.slice(start, start + FETCH_CONCURRENCY);
			reads.push(
				...(await Promise.all(batch.map(async (ref) => await this.read(source, ref, revision)))),
			);
		}
		return reads;
	}

	private async read(
		source: ParsedSource,
		ref: RemoteSkillRef,
		revision: string | undefined,
	): Promise<ReadSkill> {
		const key = refKey(ref);
		let fetched: FetchedSkill;
		try {
			fetched = await source.client.fetchLatest(source.locator, ref, undefined, revision);
		} catch (error) {
			const reason = skillSourceReasonOf(error);
			if (reason !== 'parse_error' && reason !== 'not_found') {
				throw toSkillSourceRequestError(error);
			}
			return { key, ref, error: { reason, message: getErrorMessage(error) } };
		}
		const parsed = importableSkillSchema.safeParse(contentToAgentSkill(fetched.content));
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			const field = issue?.path.join('.') || 'skill';
			return {
				key,
				ref,
				fetched,
				error: { reason: 'parse_error', message: `${field}: ${issue?.message ?? 'invalid'}` },
			};
		}
		return { key, ref, fetched, skill: parsed.data };
	}
}

function connectReport(scopeType: ScopeType): ConnectReport {
	return { provider: 'github', access: 'public', scope_type: scopeType, duplicate_result: 'none' };
}

/** A failure always carries a reason, so a bug shows in telemetry as `unexpected`. */
function telemetryReasonOf(error: unknown): SkillSourceTelemetryReason {
	return skillSourceReasonOf(error) ?? 'unexpected';
}

/** Why a source that listed skills did not list all of them, for the telemetry of a success. */
function warningOf(discovered: Discovered): SkillSourceReason | undefined {
	if (discovered.truncated) return 'too_many_skills';
	if (discovered.tooDeep > 0) return 'too_deep';
	return undefined;
}

/** Whether the input is a web link, so a link to another site is told apart from a typo. */
function isWebLink(input: string): boolean {
	try {
		const { protocol } = new URL(input.trim());
		return protocol === 'https:' || protocol === 'http:';
	} catch {
		return false;
	}
}

/** The key of a skill in the picker. The ref is opaque, so its JSON is the key. */
function refKey(ref: RemoteSkillRef): string {
	return JSON.stringify(ref);
}

function duplicateError(where: 'global' | 'scope'): SkillSourceRequestError {
	return new SkillSourceRequestError(
		'duplicate_source',
		where === 'global'
			? 'This repository is already connected in Global. Every project can use its skills.'
			: 'This repository is already connected in this scope. Add more skills to that source.',
	);
}
